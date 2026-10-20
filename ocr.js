/* Harmonia — lecture de partitions depuis un PDF ou une image (capture d'écran, photo).
   - PDF avec texte : pdf.js (Mozilla, licence Apache 2.0), lecture de la position de chaque mot.
   - PDF scanné et images : reconnaissance de texte Tesseract.js (licence Apache 2.0), sur l'appareil.
   Les deux modules sont téléchargés au premier usage depuis un CDN ; les langues (français, anglais)
   sont livrées dans lang/. Aucun fichier n'est envoyé.
   La position horizontale des accords est reportée sur la syllabe située juste en dessous. */
'use strict';

const OCR_LIBS = {
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'
};
const MAX_PDF_PAGES = 12;

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const prev = document.querySelector(`script[data-lib="${src}"]`);
    if (prev) { if (prev.dataset.loaded) resolve(); else { prev.addEventListener('load', () => resolve()); prev.addEventListener('error', () => reject(new Error('download'))); } return; }
    const s = document.createElement('script');
    s.src = src; s.async = true; s.dataset.lib = src; s.crossOrigin = 'anonymous';
    s.onload = () => { s.dataset.loaded = '1'; resolve(); };
    s.onerror = () => { s.remove(); reject(new Error('download')); };
    document.head.appendChild(s);
  });
}
function libError(e, what) {
  if (e && e.message === 'download') return new Error(navigator.onLine === false
    ? `Le module de ${what} n’a pas encore été téléchargé et vous êtes hors ligne. Reconnectez-vous une première fois, il restera ensuite disponible.`
    : `Le module de ${what} n’a pas pu être téléchargé. Vérifiez votre connexion, puis réessayez.`);
  return e;
}
async function ensurePdfJs() {
  if (!window.pdfjsLib) {
    try { await loadScriptOnce(OCR_LIBS.pdfWorker); await loadScriptOnce(OCR_LIBS.pdf); }
    catch (e) { throw libError(e, 'lecture PDF'); }
  }
  if (!window.pdfjsLib) throw new Error('Le module de lecture PDF n’a pas démarré correctement.');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = OCR_LIBS.pdfWorker;
  return window.pdfjsLib;
}
async function ensureTesseract() {
  if (!window.Tesseract) {
    try { await loadScriptOnce(OCR_LIBS.tesseract); } catch (e) { throw libError(e, 'reconnaissance de texte'); }
  }
  if (!window.Tesseract) throw new Error('Le module de reconnaissance de texte n’a pas démarré correctement.');
  return window.Tesseract;
}

/* ---------- Reconstruction : positions des mots → texte avec accords placés ---------- */
/** Regroupe des fragments {text, x, y, w, h} (y = haut, de haut en bas) en lignes. */
function itemsToLines(items) {
  const its = items.filter((i) => i.text !== '' && Number.isFinite(i.x) && Number.isFinite(i.y)).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of its) {
    const h = it.h || 10;
    const line = lines.find((l) => Math.abs(l.y - it.y) < Math.min(l.h, h) * 0.5);
    if (line) { line.items.push(it); line.h = Math.max(line.h, h); } else lines.push({ y: it.y, h, items: [it] });
  }
  lines.sort((a, b) => a.y - b.y);
  lines.forEach((l) => l.items.sort((a, b) => a.x - b.x));
  return lines;
}
/** Texte d'une ligne et abscisse de chaque caractère (interpolée à l'intérieur de chaque fragment). */
function lineChars(line, cw) {
  let text = '', xs = [], end = null;
  for (const it of line.items) {
    const t = it.text;
    if (!t) continue;
    if (end !== null) {
      const gap = it.x - end;
      if (gap > cw * 0.3 && !/\s$/.test(text) && !/^\s/.test(t)) {
        const n = Math.max(1, Math.round(gap / cw));
        for (let k = 0; k < n; k++) { text += ' '; xs.push(end + (k * gap) / n); }
      }
    }
    const step = it.w && t.length ? it.w / t.length : cw;
    for (let k = 0; k < t.length; k++) { text += t[k]; xs.push(it.x + k * step); }
    end = it.x + (it.w || t.length * cw);
  }
  return { text, xs, end: end ?? 0 };
}
/** Corrige les confusions fréquentes de la reconnaissance sur une ligne d'accords (« c » → « C », « Am7 » lu « Arn7 »…). */
function normalizeOcrChordLine(text) {
  const toks = text.trim().split(/\s+/).filter(Boolean);
  if (!toks.length || toks.some((t) => t.length > 8)) return text;
  const fix = (t) => {
    let u = t.replace(/^\(|\)$/g, '').replace(/rn/g, 'm').replace(/[|]/g, '');
    if (/^[a-g]/.test(u)) u = u[0].toUpperCase() + u.slice(1);
    u = u.replace(/^([A-G])8/, '$1b').replace(/^([A-G])#?(m)?(7|9|6)?l$/, '$1$2$3');
    return u;
  };
  const fixed = toks.map(fix);
  const chordLike = fixed.filter((t) => CHORD_TOKEN.test(t)).length;
  if (chordLike / fixed.length < 0.6) return text;
  // conserver les positions : remplacer chaque jeton à sa place
  let out = text, from = 0;
  toks.forEach((t, i) => { const at = out.indexOf(t, from); if (at >= 0) { out = out.slice(0, at) + fixed[i].padEnd(t.length, ' ') + out.slice(at + t.length); from = at + fixed[i].length; } });
  return out;
}
/** Paroles de partition découpées en syllabes (« mu - si - que ») : on recolle les mots. */
function joinSyllables(line) {
  const cut = /([A-Za-zÀ-ÿ'’])\s*[-–]\s+(?=[A-Za-zÀ-ÿ[])/g;
  const out = (line.match(cut) || []).length >= 2 ? line.replace(cut, '$1') : line;
  return out.replace(/\s+_{2,}/g, '');
}
/** Ligne de paroles : espaces multiples réduits (la position des accords est déjà fixée). */
const tidyLyric = (t, fromOcr) => joinSyllables(fromOcr ? t.replace(/(^|\s|\])[=|~]+(?=\s|$)/g, '$1') : t).replace(/(\S)\s{2,}(?=\S)/g, '$1 ').replace(/\s+$/, '');
/** Assemble les lignes en texte ; une ligne d'accords placée au-dessus d'une ligne de paroles est fusionnée en ChordPro. */
function layoutToSongText(lines, fromOcr = false) {
  if (!lines.length) return '';
  const widths = [];
  lines.forEach((l) => l.items.forEach((it) => { const n = it.text.replace(/\s+$/, '').length; if (n > 1 && it.w > 0) widths.push(it.w / it.text.length); }));
  widths.sort((a, b) => a - b);
  const cw = widths.length ? widths[Math.floor(widths.length / 2)] : 7;
  const minX = Math.min(...lines.flatMap((l) => l.items.map((i) => i.x)));
  const scoreNoise = typeof SCORE_NOISE_RE !== 'undefined' ? SCORE_NOISE_RE : /^\s*\d{1,3}\s*$/;
  const rows = lines.map((l) => { const r = { ...lineChars(l, cw), y: l.y, h: l.h }; if (fromOcr) r.text = normalizeOcrChordLine(r.text); return r; })
    // numéros de mesure, nuances et indications de tempo d'une partition ; restes de portée lus par l'OCR (« = a = »)
    .filter((r) => isChordLine(r.text) || (!scoreNoise.test(r.text.trim()) && !(fromOcr && r.text.trim().split(/\s+/).every((t) => t.length <= 2 && !CHORD_TOKEN.test(t)))));
  const gaps = [];
  for (let i = 1; i < rows.length; i++) gaps.push(rows[i].y - rows[i - 1].y);
  const sorted = gaps.slice().sort((a, b) => a - b);
  const g = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 20;
  const chordTokens = (row) => {
    const out = [];
    const re = /\S+/g; let m;
    while ((m = re.exec(row.text))) out.push({ c: m[0], x: row.xs[m.index] });
    return out;
  };
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (i > 0 && r.y - rows[i - 1].y > g * 1.7) out.push('');
    const next = rows[i + 1];
    // accords au-dessus des paroles ; sur une partition, une portée sans texte peut les séparer (écart plus grand)
    if (isChordLine(r.text) && next && next.text.trim() && !isChordLine(next.text) && next.y - r.y < Math.max(g * 1.6, r.h * 7) && !SECTION_RE.test(next.text) && !TAB_LINE.test(next.text)) {
      let lyric = next.text, xs = next.xs.slice();
      const toks = chordTokens(r).filter((t) => CHORD_TOKEN.test(t.c));
      for (let k = toks.length - 1; k >= 0; k--) {
        const t = toks[k];
        let idx = xs.findIndex((x) => x >= t.x - cw * 0.45);
        if (idx < 0) { const pad = Math.max(1, Math.round((t.x - next.end) / cw)); lyric += ' '.repeat(pad); idx = lyric.length; }
        lyric = lyric.slice(0, idx) + `[${t.c}]` + lyric.slice(idx);
      }
      out.push(tidyLyric(lyric, fromOcr));
      i++;
      continue;
    }
    if (isChordLine(r.text)) {
      // ligne d'accords seule : on garde l'espacement relatif
      let s = '';
      for (const t of chordTokens(r)) { const col = Math.round((t.x - minX) / cw); s = s.padEnd(Math.max(col, s.length ? s.length + 1 : 0), ' ') + t.c; }
      out.push(s);
      continue;
    }
    if (TAB_LINE.test(r.text)) { out.push(r.text.replace(/\s+/g, (m0) => (m0.length > 1 ? m0 : ''))); continue; }
    out.push(tidyLyric(r.text, fromOcr));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/* ---------- PDF ---------- */
async function pdfToText(file, progress) {
  const lib = await ensurePdfJs();
  progress('Ouverture du PDF…', 0.05);
  let doc;
  try { doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise; }
  catch (e) { throw new Error(e && e.name === 'PasswordException' ? 'Ce PDF est protégé par un mot de passe.' : 'Ce fichier PDF est illisible ou endommagé.'); }
  const n = Math.min(doc.numPages, MAX_PDF_PAGES);
  const parts = []; let chars = 0;
  for (let p = 1; p <= n; p++) {
    progress(`Lecture de la page ${p} sur ${n}…`, 0.05 + 0.4 * (p / n));
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items.filter((i) => typeof i.str === 'string').map((i) => {
      const h = Math.hypot(i.transform[2], i.transform[3]) || i.height || 10;
      return { text: i.str, x: i.transform[4], y: vp.height - i.transform[5] - h, w: i.width, h };
    });
    chars += items.reduce((a, i) => a + i.text.trim().length, 0);
    parts.push({ page, items });
  }
  if (chars >= 20) return { text: parts.map((pt) => layoutToSongText(itemsToLines(pt.items))).join('\n\n'), method: 'pdf', pages: n, truncated: doc.numPages > n };
  // PDF scanné (aucun texte) : on dessine chaque page puis on lance la reconnaissance de texte
  const texts = [];
  for (let k = 0; k < parts.length; k++) {
    const vp = parts[k].page.getViewport({ scale: 2.2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
    await parts[k].page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const res = await ocrCanvas(canvas, (msg, f) => progress(`Page ${k + 1} sur ${parts.length} : ${msg}`, 0.45 + 0.55 * ((k + f) / parts.length)));
    texts.push(res);
  }
  return { text: texts.join('\n\n'), method: 'ocr', pages: n, truncated: doc.numPages > n };
}

/* ---------- Images (capture d'écran, photo) ---------- */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cette image n’a pas pu être ouverte. Formats acceptés : PNG, JPEG, WebP, GIF.')); };
    img.src = url;
  });
}
/** Prépare l'image : agrandie si petite, en niveaux de gris, contraste renforcé (meilleure reconnaissance). */
function prepareCanvas(img) {
  const scale = img.naturalWidth < 1400 ? Math.min(3, 1400 / img.naturalWidth) : 1;
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) { const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; px[i] = px[i + 1] = px[i + 2] = y; sum += y; }
  // fond sombre (mode sombre d'une application) : on inverse pour obtenir du texte foncé sur fond clair
  if (sum / (px.length / 4) < 110) for (let i = 0; i < px.length; i += 4) { px[i] = px[i + 1] = px[i + 2] = 255 - px[i]; }
  g.putImageData(d, 0, 0);
  return c;
}
let ocrWorker = null;
/** Adresse absolue du dossier lang/ de l'application (null en fichier local, où fetch est refusé). */
function localLangPath() {
  try { if (!/^https?:$/.test(location.protocol)) return null; return new URL('lang', document.baseURI).href; }
  catch (e) { return null; }
}
async function ocrCanvas(canvas, progress) {
  const T = await ensureTesseract();
  progress('préparation de la reconnaissance (première fois : téléchargement des langues)…', 0);
  if (!ocrWorker) {
    const opts = {
      logger: (m) => { if (m && m.status === 'recognizing text' && ocrWorker && ocrWorker._progress) ocrWorker._progress(m.progress); }
    };
    // Langues livrées avec l'application (dossier lang/) : pas de téléchargement depuis un autre site.
    const local = localLangPath();
    if (local) { opts.langPath = local; opts.gzip = false; }
    try { ocrWorker = await T.createWorker('fra+eng', 1, opts); }
    catch (e) {
      ocrWorker = null;
      if (local && !window.HARMONIA_EMBED) {
        // repli : données des langues depuis le CDN de Tesseract.js
        try { ocrWorker = await T.createWorker('fra+eng', 1, { logger: opts.logger }); } catch (e2) { ocrWorker = null; }
      }
      if (!ocrWorker) throw new Error(window.HARMONIA_EMBED
        ? 'La reconnaissance de texte n’a pas pu démarrer dans cet aperçu (le navigateur a bloqué un de ses composants). Elle fonctionne dans la version installée ou servie en https. En attendant, la fonction « Texte en direct » de votre téléphone ou ordinateur permet de copier le texte de la capture, à coller dans « Coller du texte ».'
        : 'La reconnaissance de texte n’a pas pu démarrer (module ou langues non téléchargés). Vérifiez votre connexion, puis réessayez.');
    }
    await ocrWorker.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' });
  }
  ocrWorker._progress = (f) => progress(`reconnaissance du texte… ${Math.round(f * 100)} %`, f);
  const { data } = await ocrWorker.recognize(canvas);
  const lines = (data.lines || []).map((l) => ({
    y: l.bbox.y0, h: l.bbox.y1 - l.bbox.y0,
    items: (l.words || []).filter((w) => w.text && w.confidence > 20).map((w) => ({ text: w.text, x: w.bbox.x0, y: l.bbox.y0, w: w.bbox.x1 - w.bbox.x0, h: l.bbox.y1 - l.bbox.y0 }))
  })).filter((l) => l.items.length);
  return layoutToSongText(lines, true);
}
async function imageToText(file, progress) {
  progress('Ouverture de l’image…', 0.02);
  const img = await loadImage(file);
  const text = await ocrCanvas(prepareCanvas(img), (msg, f) => progress(msg[0].toUpperCase() + msg.slice(1), f));
  return { text, method: 'ocr', pages: 1 };
}
/** Point d'entrée : un fichier PDF ou image → texte prêt pour le collage intelligent. */
async function documentToText(file, progress) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImg = /^image\//.test(file.type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
  if (!isPdf && !isImg) throw new Error('Choisissez un fichier PDF ou une image (PNG, JPEG, WebP).');
  if (file.size > 25 * 1024 * 1024) throw new Error('Ce fichier dépasse 25 Mo.');
  const r = isPdf ? await pdfToText(file, progress) : await imageToText(file, progress);
  if (!r.text.trim()) throw new Error(r.method === 'ocr' ? 'Aucun texte n’a été reconnu. Essayez une capture plus nette, plus grande ou mieux cadrée.' : 'Ce PDF ne contient pas de texte lisible.');
  return r;
}
