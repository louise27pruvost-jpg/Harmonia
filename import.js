/* Harmonia — importation, exportation, collage intelligent, recherche web */
'use strict';
/* ===================================================================
   Importation / exportation
   =================================================================== */
function splitChordProSongs(text) { return String(text).split(/^\s*\{\s*(?:new_song|ns)\s*\}\s*$/im).map((t) => t.trim()).filter(Boolean); }
function importText(text, filename) {
  const name = (filename || '').replace(/\.[^.]+$/, '');
  const ext = ((filename || '').match(/\.([^.]+)$/) || [])[1]?.toLowerCase() || '';
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Le fichier est vide.');
  if (ext === 'json' || /^[[{]/.test(trimmed) && /^\s*[[{]\s*"/.test(trimmed)) {
    let data;
    try { data = JSON.parse(trimmed); } catch (e) { throw new Error('Le fichier JSON est mal formé (' + e.message + ').'); }
    if (data && Array.isArray(data.songs)) return { kind: 'backup', data: sanitizeStore(data) };
    const arr = Array.isArray(data) ? data : [data];
    const songs = arr.filter((o) => o && typeof o === 'object' && (o.title || o.body)).map((o) => makeSong({ ...o, id: undefined, source: 'import', fav: !!o.fav }, 'import'));
    if (!songs.length) throw new Error('Aucune chanson reconnue dans ce JSON : chaque chanson doit avoir au moins un titre (title) ou un contenu (body).');
    return { kind: 'songs', songs };
  }
  const parts = looksLikeChordPro(trimmed) ? splitChordProSongs(trimmed) : [trimmed];
  const songs = parts.map((p, i) => {
    const src = looksLikeChordPro(p) ? p : plainToChordPro(p);
    const d = chordProToSong(src, parts.length > 1 ? `${name || 'Chanson importée'} ${i + 1}` : name || 'Chanson importée');
    if (!d.body.trim()) throw new Error('La chanson « ' + d.title + ' » ne contient ni paroles ni accords.');
    return makeSong({ ...d, source: 'import' }, 'import');
  });
  return { kind: 'songs', songs };
}
/** Ajoute les chansons importées ; renvoie true seulement si l'enregistrement a réussi. */
async function addImported(songs) {
  songs.forEach((s) => store.songs.push(s));
  const ok = await saveNow();
  if (!ok) { const ids = new Set(songs.map((s) => s.id)); store.songs = store.songs.filter((s) => !ids.has(s.id)); }
  return ok;
}
async function mergeBackup(b, replace) {
  const before = store;
  let msg;
  if (replace) { store = b; msg = `Bibliothèque restaurée : ${b.songs.length} chanson${b.songs.length > 1 ? 's' : ''}`; }
  else {
    const byId = new Map(store.songs.map((s) => [s.id, s]));
    let added = 0, updated = 0;
    for (const s of b.songs) {
      const cur = byId.get(s.id);
      if (!cur) { store.songs.push(s); added++; }
      else if ((s.updatedAt || 0) > (cur.updatedAt || 0)) { Object.assign(cur, s); updated++; }
    }
    for (const p of b.playlists) {
      const cur = store.playlists.find((x) => x.id === p.id);
      if (!cur) store.playlists.push(p);
      else p.songIds.forEach((id) => { if (!cur.songIds.includes(id)) cur.songIds.push(id); });
    }
    msg = `${added} chanson${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}, ${updated} mise${updated > 1 ? 's' : ''} à jour`;
  }
  applySettings();
  const ok = await commit(msg);
  if (!ok && replace) { store = before; applySettings(); }
  return ok;
}
function impMsg(html, kind) { const m = $('#imp-msg'); if (m) m.innerHTML = `<div class="notice ${kind}">${icon(kind === 'ok' ? 'check' : 'info')}<p>${html}</p></div>`; }
async function handleFiles(files) {
  const list = Array.from(files || []);
  if (!list.length) return;
  const ok = [], errs = [];
  const doc = list.find((f) => /\.(pdf|musicxml|mxl)$/i.test(f.name) || /^image\//.test(f.type) || f.type === 'application/pdf' || (/\.xml$/i.test(f.name)));
  if (doc) { handleScan(doc); return; }
  for (const f of list) {
    try {
      if (f.size > 5 * 1024 * 1024) throw new Error('fichier trop volumineux (plus de 5 Mo).');
      const text = await f.text();
      const r = importText(text, f.name);
      if (r.kind === 'backup') { confirmRestore(r.data, f.name); return; }
      ok.push(...r.songs);
    } catch (e) { errs.push(`<strong>${esc(f.name)}</strong> : ${esc(e.message)}`); }
  }
  if (ok.length && !(await addImported(ok))) {
    impMsg(`L’enregistrement a échoué (${esc(lastSaveError)}). Rien n’a été importé ; votre bibliothèque est intacte.`, 'err');
    return;
  }
  const parts = [];
  if (ok.length) parts.push(`${ok.length} chanson${ok.length > 1 ? 's importées' : ' importée'} : ${ok.map((s) => esc(s.title)).join(', ')}.`);
  if (errs.length) parts.push(`Non importé, votre bibliothèque est intacte. ${errs.join(' ; ')}`);
  impMsg(parts.join('<br>'), errs.length ? (ok.length ? 'warn' : 'err') : 'ok');
  if (ok.length) { render(); }
  if (ok.length === 1 && !errs.length) { closeModal(); openSong(ok[0].id); toast('Chanson importée', 'ok'); }
}
function confirmRestore(data, name) {
  openModal(`<div class="mdl">
    <div class="mdl-head"><h2>Restaurer une sauvegarde</h2><button class="iconbtn sm" data-act="modal-close" aria-label="Fermer">${icon('close', 'sm')}</button></div>
    <p>Le fichier <strong>${esc(name)}</strong> contient ${data.songs.length} chanson${data.songs.length > 1 ? 's' : ''} et ${data.playlists.length} playlist${data.playlists.length > 1 ? 's' : ''}.</p>
    <p class="muted">Fusionner ajoute les chansons absentes et met à jour celles dont la version du fichier est plus récente. Rien n’est supprimé. Remplacer efface la bibliothèque actuelle (une confirmation vous sera demandée).</p>
    <div class="mdl-foot"><button class="btn btn-ghost" data-act="modal-close">Annuler</button><button class="btn btn-danger-ghost" id="rs-replace">Remplacer tout</button><button class="btn btn-primary" id="rs-merge">Fusionner</button></div>
  </div>`);
  $('#rs-merge').onclick = async () => { closeModal(); await mergeBackup(data, false); go(ui.view === 'song' || ui.view === 'edit' ? 'library' : ui.view); };
  $('#rs-replace').onclick = () => askConfirm('Remplacer toute la bibliothèque', `Vos ${store.songs.length} chanson${store.songs.length > 1 ? 's' : ''} actuelle${store.songs.length > 1 ? 's' : ''} seront remplacées par les ${data.songs.length} du fichier. Pensez à exporter la bibliothèque actuelle avant si vous voulez la garder.`, 'Remplacer', async () => { await mergeBackup(data, true); go('library'); });
}
function safeName(s) { return (norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chanson').slice(0, 60); }
function backupData() { return JSON.stringify({ app: 'Harmonia', format: 1, exportedAt: new Date().toISOString(), songs: store.songs, playlists: store.playlists, history: store.history, lastSongId: store.lastSongId, practice: store.practice, settings: store.settings }, null, 2); }
function markExported() { store.lastExport = Date.now(); saveNow(); }
let downloadsCap;
async function getDownloads() {
  if (downloadsCap !== undefined) return downloadsCap;
  try { downloadsCap = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null; } catch (e) { downloadsCap = null; }
  return downloadsCap;
}
function offerFile(filename, text, title, onSaved) {
  openModal(`<div class="mdl">
    <div class="mdl-head"><div><h2>${esc(title)}</h2><p class="muted num" style="font-size:14px">${esc(filename)} · ${fmtNum(new Blob([text]).size / 1024, 1)} Ko</p></div><button class="iconbtn sm" data-act="modal-close" aria-label="Fermer">${icon('close', 'sm')}</button></div>
    <label class="sr-only" for="exp-text">Contenu du fichier</label>
    <textarea id="exp-text" class="textarea mono" rows="9" readonly>${esc(text)}</textarea>
    <p id="exp-msg" class="help" role="status"></p>
    <div class="mdl-foot"><button class="btn btn-ghost" id="exp-copy">${icon('copy', 'sm')}Copier</button><button class="btn btn-primary" id="exp-dl">${icon('export', 'sm')}Enregistrer le fichier</button></div>
  </div>`);
  const msg = (t) => { $('#exp-msg').textContent = t; };
  $('#exp-copy').onclick = () => {
    const ta = $('#exp-text');
    const fallback = () => { ta.focus(); ta.select(); msg('Texte sélectionné : utilisez Copier dans le menu de votre appareil.'); };
    try { navigator.clipboard.writeText(text).then(() => { msg('Copié dans le presse-papiers. Collez-le dans un fichier texte pour le conserver.'); onSaved && onSaved(); }, fallback); } catch (e) { fallback(); }
  };
  $('#exp-dl').onclick = async () => {
    const dl = await getDownloads();
    if (dl) {
      try { await dl.save({ filename, data: text }); msg('Fichier enregistré.'); onSaved && onSaved(); }
      catch (e) { msg(e && e.code === 'declined' ? 'Enregistrement annulé.' : 'L’enregistrement n’est pas possible ici. Copiez le texte à la place.'); }
      return;
    }
    if (window.claude) { msg('L’enregistrement de fichiers n’est pas disponible dans cette fenêtre. Copiez le texte à la place.'); return; }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: filename.endsWith('.json') ? 'application/json' : 'text/plain' }));
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      msg('Téléchargement lancé. Vérifiez le dossier Téléchargements de votre navigateur.'); onSaved && onSaved();
    } catch (e) { msg('Le téléchargement a échoué. Copiez le texte à la place.'); }
  };
}

/* ===================================================================
   Collage intelligent : nettoyage d'une partition copiée depuis une page web
   =================================================================== */
const NOISE_RE = /^(print|imprimer|transpose[rz]?|transposition|auto ?scroll|d[ée]filement( auto(matique)?)?|font( size)?|police|taille du texte|report( bad tab)?|signaler( une erreur)?|add to (playlist|favou?rites)|ajouter (à|aux) (une playlist|favoris|ma liste)|share|partager|download( pdf)?|t[ée]l[ée]charger( (le )?pdf)?|comments?|commentaires?|[\d\s.,k]+ (views|vues|ratings|votes|avis|commentaires|comments)|ratings?|tabbed by.*|transcrit(e)? par.*|last (edit|update).*|derni[èe]re (modification|mise à jour).*|thanks?( you)?( for).*|merci (à|pour).*|chords used|accords utilis[ée]s|accords|chords|strumming( pattern)?|rythmique|show (chords|diagrams)|hide (chords|diagrams)|(afficher|masquer) les (accords|diagrammes)|simplify|simplifier|copy|copier|log ?in|sign (up|in)|connexion|inscription|s'inscrire|menu|search|rechercher|ver(sion)? ?\d+|page \d+\s*(\/|sur)\s*\d+|advertisement|publicit[ée]|sponsoris[ée]|related( songs| tabs)?|voir aussi|plus de .{0,40}|more (songs|tabs).{0,40}|follow|suivre|playlist|ukulele|guitar|guitare|piano|tab|tabs|tablature|paroles|lyrics|official|edit|modifier|close|fermer|\d+ ?%)\s*[:.!]?\s*$/i;
const SCORE_NOISE_RE = /^(?:(?:\d{1,3}|pp?p?|mp|mf|ff?f?|sfz?|fp|cresc\.?|dim\.?|decresc\.?|rit\.?|rall\.?|accel\.?|a tempo|legato|staccato|piano|pno\.?|voix|voice|chant|moderato|allegro|andante|adagio|lento|presto|8va|loco|ped\.?|[♩♪]\s*=\s*\d+|=\s*\d+|\*)\s*)+$/i;
const STATS_RE = /^[\d\s.,kKM]+\s*(views|vues|saves|favoris|favorites|ratings|votes|avis|comments|commentaires|likes|j'aime)\b.*$/i;
const SOURCE_RE = /(©|copyright|all rights reserved|tous droits r[ée]serv[ée]s|https?:\/\/|www\.|source\s*:)/i;
const CHORD_DEF_RE = /^\s*[A-G][#b]?\S{0,8}\s*:?\s*[x0-9]{6}(\s+[x0-9]{6})*\s*$/i;
const DIFF_MAP = [[/beginner|novice|facile|easy|d[ée]butant/i, 'Débutant'], [/intermediate|interm[ée]diaire|moyen/i, 'Intermédiaire'], [/advanced|avanc[ée]|difficile|expert/i, 'Avancé']];
const SECTION_FR = [
  [/^pre-?chorus|^pr[ée]-?refrain/i, 'Pré-refrain'], [/^post-?chorus/i, 'Post-refrain'], [/^chorus|^refrain|^hook/i, 'Refrain'],
  [/^verse|^couplet/i, 'Couplet'], [/^bridge|^pont/i, 'Pont'], [/^intro(duction)?/i, 'Introduction'], [/^outro|^fin\b|^coda/i, 'Fin'],
  [/^solo/i, 'Solo'], [/^interlude|^break|^instrumental/i, 'Interlude'], [/^riff/i, 'Riff']
];
function sectionLabel(raw) {
  const t = String(raw).trim().replace(/^[[(]\s*/, '').replace(/\s*[\])]\s*:?\s*$/, '').replace(/\s*:\s*$/, '');
  for (const [re, l] of SECTION_FR) { const m = t.match(re); if (m) { const rest = t.slice(m[0].length).trim(); return (l + (rest ? ' ' + rest : '')).trim(); } }
  return t;
}
function cleanTitle(t) {
  let s = String(t || '').trim().replace(/^["«“'\s]+|["»”'\s]+$/g, '');
  for (let i = 0; i < 3; i++) s = s.replace(/\s*[-–(]?\s*\b(chords?|accords?( guitare)?|tabs?|tablature|paroles( et accords)?|lyrics|ukulele|guitar|guitare|ver(?:sion)?\.?\s*\d+)\s*\)?\s*$/i, '').trim();
  return s;
}
function analyzePaste(raw) {
  let text = String(raw || '').replace(/\r\n?/g, '\n').replace(/[   ]/g, ' ').replace(/\t/g, '    ')
    .replace(/\[\/?ch\]/gi, '').replace(/\[\/?tab\]/gi, '').replace(/[​﻿]/g, '');
  const meta = { title: '', artist: '', key: '', capo: '', difficulty: '', ambiguous: false };
  const notes = [], removed = [];
  // Fichier ChordPro complet (directives) : lu tel quel. Les lignes « [G]paroles » isolées passent par le nettoyage.
  if (/^\s*\{\s*(title|t|artist|start_of_\w+|soc|sov|sob|sot|key|capo)\s*(:.*)?\}\s*$/im.test(text)) {
    const d = chordProToSong(text, '');
    const info = bodyInfo(d.body);
    return { ...d, notes: '', removed, ambiguous: false, chordCount: info.list.length, hasChords: info.chords, lineCount: d.body.split('\n').filter((l) => l.trim()).length, format: 'ChordPro' };
  }
  const kept = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    const t = line.trim();
    if (!t) { kept.push(''); continue; }
    let m;
    if ((m = t.match(/^(?:title|titre|song|chanson)\s*[:\-–]\s*(.+)$/i))) { meta.title = meta.title || m[1]; continue; }
    if ((m = t.match(/^(?:artist|artiste|interpr[èe]te|auteur|band|groupe|by|par)\s*[:\-–]\s*(.+)$/i))) { meta.artist = meta.artist || m[1]; continue; }
    if ((m = t.match(/^(?:key|tonalit[ée]|ton)\s*[:\-–]?\s*([A-G](?:#|b|♯|♭)?m?)\b/i))) { meta.key = meta.key || m[1].replace('♯', '#').replace('♭', 'b'); continue; }
    if (/^(no capo|sans capo|capo\s*[:\-]?\s*(none|aucun|non|no|0))\b/i.test(t)) continue;
    if ((m = t.match(/^capo\s*[:\-–]?\s*(?:on |en |sur )?(?:la )?(?:case |fret )?(\d{1,2})/i))) { meta.capo = meta.capo || String(Number(m[1])); continue; }
    if ((m = t.match(/^(?:difficulty|difficult[ée]|niveau|level)\s*[:\-–]?\s*(.+)$/i))) { const f = DIFF_MAP.find(([re]) => re.test(m[1])); if (f) meta.difficulty = f[1]; continue; }
    if ((m = t.match(/^(?:tuning|accordage)\s*[:\-–]?\s*(.+)$/i))) { if (!/standard|e a d g b e/i.test(m[1])) notes.push('Accordage : ' + m[1]); continue; }
    if ((m = t.match(/^(?:bpm|tempo)\s*[:\-–]?\s*(.+)$/i))) { notes.push('Tempo : ' + m[1]); continue; }
    if (CHORD_DEF_RE.test(t)) { removed.push(t); continue; }
    if (t.length < 90 && !isChordLine(t) && (NOISE_RE.test(t) || STATS_RE.test(t) || SCORE_NOISE_RE.test(t))) { removed.push(t); continue; }
    if (SOURCE_RE.test(t) && !isChordLine(t)) { notes.push(t); removed.push(t); continue; }
    if ((m = t.match(/^(intro(?:duction)?|outro|interlude|solo|riff|fin|coda|break|instrumental)\s*[:\-–]\s*(.+)$/i)) && isChordLine(m[2])) {
      kept.push(`{comment: ${sectionLabel(m[1])}}`);
      kept.push(m[2].trim().split(/\s+/).map((c) => (CHORD_TOKEN.test(c) ? `[${c}]` : c)).join('  '));
      continue;
    }
    if (SECTION_RE.test(line)) { kept.push(`{comment: ${sectionLabel(t)}}`); continue; }
    kept.push(line);
  }
  // Repérage du titre et de l'artiste dans les premières lignes
  const isContent = (l) => isChordLine(l) || /^\{comment:/.test(l) || TAB_LINE.test(l) || /\[[A-G][^\]\s]{0,8}\]/.test(l);
  let start = kept.findIndex(isContent);
  if (start < 0) start = kept.length;
  const headIdx = [];
  for (let i = 0; i < start && headIdx.length < 4; i++) if (kept[i].trim()) headIdx.push(i);
  const nextBlankAfter = (i) => i + 1 >= kept.length || !kept[i + 1].trim();
  const usable = headIdx.filter((i, k) => start < kept.length || (k === 0 && nextBlankAfter(i)));
  const used = [];
  for (const i of usable) {
    if (meta.title && meta.artist) break;
    const t = kept[i].trim();
    if (t.length > 90) break;
    let m;
    if (!meta.title && (m = t.match(/^(.+?)\s+(?:chords?|accords?|tabs?|tablature|paroles(?: et accords)?|lyrics)\s+(?:by|par|de)\s+(.+)$/i))) { meta.title = m[1]; meta.artist = meta.artist || m[2]; used.push(i); continue; }
    if (!meta.title && (m = t.match(/^(.+?)\s+(?:by|par)\s+(.+)$/i)) && t.length < 70) { meta.title = m[1]; meta.artist = meta.artist || m[2]; used.push(i); continue; }
    if (!meta.title && (m = t.match(/^(.+?)\s+[-–—|]\s+(.+)$/)) && t.length < 80) { meta.title = m[1]; meta.artist = meta.artist || m[2]; meta.ambiguous = true; used.push(i); continue; }
    if (!meta.title && t.length < 70 && !/[,;.!?]$/.test(t)) { meta.title = t; used.push(i); continue; }
    if (meta.title && !meta.artist && t.length < 60 && !/[,;.!?]$/.test(t)) { meta.artist = t.replace(/^(by|par|de)\s+/i, ''); used.push(i); continue; }
    break;
  }
  const bodyLines = kept.filter((_, i) => !used.includes(i));
  let plain = bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
  const body = plainToChordPro(plain);
  const info = bodyInfo(body);
  return {
    title: cleanTitle(meta.title), artist: cleanTitle(meta.artist), key: parseChord(meta.key) ? meta.key : '', capo: meta.capo, difficulty: meta.difficulty,
    structure: '', body, notes: notes.join('\n'), removed, ambiguous: meta.ambiguous,
    chordCount: info.list.length, hasChords: info.chords, lineCount: body.split('\n').filter((l) => l.trim()).length, format: 'texte'
  };
}

/* ---------- Chercher sur le web (liens ouverts dans un nouvel onglet) ---------- */
const WEB_SOURCES = [
  { name: 'Google', desc: 'Toutes les sources', kind: 'web', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q + ' accords guitare')}` },
  { name: 'DuckDuckGo', desc: 'Sans pistage', kind: 'web', url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q + ' accords guitare')}` },
  { name: 'Ultimate Guitar', desc: 'Accords et tablatures', kind: 'perso', url: (q) => `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}` },
  { name: 'Songsterr', desc: 'Tablatures', kind: 'perso', url: (q) => `https://www.songsterr.com/?pattern=${encodeURIComponent(q)}` },
  { name: 'Wikisource', desc: 'Textes du domaine public', kind: 'libre', url: (q) => `https://fr.wikisource.org/w/index.php?search=${encodeURIComponent(q)}` },
  { name: 'IMSLP', desc: 'Partitions du domaine public', kind: 'libre', url: (q) => `https://imslp.org/index.php?search=${encodeURIComponent(q)}` }
];
function webSearchCard(q) {
  const query = String(q || '').trim();
  const kindLbl = { web: ['Moteur', 'blue'], perso: ['Usage personnel', 'peach'], libre: ['Libre de droits', 'sage'] };
  return `<section class="card stack" aria-labelledby="h-web">
    <div class="section-head"><h2 id="h-web">Chercher sur le web</h2></div>
    ${query ? `<p class="muted" style="font-size:14px">Ouvre « ${esc(query)} » dans un nouvel onglet. Copiez ensuite la partition et collez-la dans Harmonia : le titre, l’artiste et les accords sont repérés automatiquement.</p>
    <div class="web-grid">${WEB_SOURCES.map((s) => `<a class="web-link" href="${esc(s.url(query))}" target="_blank" rel="noopener noreferrer">
        <span class="wl-name">${esc(s.name)}${icon('next', 'sm')}</span><span class="wl-desc">${esc(s.desc)}</span><span class="chip ${kindLbl[s.kind][1]}">${kindLbl[s.kind][0]}</span></a>`).join('')}</div>`
    : '<p class="muted" style="font-size:14px">Saisissez un titre ou un artiste dans le champ de recherche pour obtenir des liens vers les principaux sites.</p>'}
    <div class="row"><button class="btn btn-primary sm" data-act="import" data-mode="paste">${icon('copy', 'sm')}Coller une partition</button>
      <span class="help">ou appuyez sur <kbd>Ctrl</kbd>+<kbd>V</kbd> (<kbd>⌘</kbd>+<kbd>V</kbd> sur Mac) depuis l’accueil, la recherche ou la bibliothèque.</span></div>
    <p class="help">Les partitions des sites marqués « Usage personnel » restent la propriété de leurs auteurs : gardez-les pour votre pratique, sans les republier.</p>
  </section>`;
}

/* ---------- Répertoire libre : vues et actions ---------- */
function catalogOwned(c) {
  return store.songs.find((s) => s.catalogId === c.id) || store.songs.find((s) => (s.source === 'example' || s.source === 'catalog') && norm(s.title) === norm(c.title));
}
function catalogRow(c) {
  const own = catalogOwned(c);
  const p = parseChord(c.key || '');
  return `<li class="song-row">
    <span class="key-tab ${p ? 'c' + (pcOf(p.root) % 5) : 'c0'}" aria-hidden="true">${esc(c.key || '')}</span>
    <div class="song-main" style="cursor:default">
      <span class="song-title">${esc(c.title)}</span>
      <span class="song-sub"><span>${esc(c.artist)}</span><span class="avail">${(c.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</span></span>
    </div>
    <span class="song-actions">
      <button type="button" class="iconbtn plain sm" data-act="cat-file" data-id="${c.id}" aria-label="Ranger ${esc(c.title)} dans une playlist" title="Ranger dans une playlist">${icon('listplus')}</button>
      <button type="button" class="iconbtn plain sm fav-btn" data-act="cat-fav" data-id="${c.id}" aria-pressed="${!!(own && own.fav)}" aria-label="${own && own.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} : ${esc(c.title)}">${icon('heart')}</button>
      ${own ? `<button class="btn btn-ghost sm" data-act="open" data-id="${own.id}">${icon('play', 'sm')}<span class="lbl">Ouvrir</span></button>` : `<button class="btn btn-soft sm" data-act="cat-add" data-id="${c.id}" aria-label="Ajouter ${esc(c.title)} à la bibliothèque">${icon('plus', 'sm')}<span class="lbl">Ajouter</span></button>`}</span>
  </li>`;
}
function catalogSearch(q, field) {
  const n = norm(q);
  return CATALOG.filter((c) => {
    if (!n) return true;
    const t = norm(c.title), a = norm(c.artist), g = norm((c.tags || []).join(' '));
    return field === 'title' ? t.includes(n) : field === 'artist' ? a.includes(n) : t.includes(n) || a.includes(n) || g.includes(n);
  });
}
function freeRepertoire() {
  const tag = ui.lib.catTag;
  const list = catalogSearch(ui.lib.q, 'all').filter((c) => !tag || (c.tags || []).includes(tag)).sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  const missing = CATALOG.filter((c) => !catalogOwned(c)).length;
  return `<div class="notice ok">${icon('check')}<p><strong>${CATALOG.length} chansons libres de droits.</strong> Paroles du domaine public (chansons traditionnelles et œuvres anciennes), accords arrangés pour la guitare par Harmonia. Ajoutez-les à votre bibliothèque pour les jouer, les transposer ou les modifier.</p></div>
    <div class="lib-controls">
      <div class="searchbox">${icon('search')}<label for="lib-q" class="sr-only">Rechercher dans le répertoire libre</label><input id="lib-q" class="input" type="search" placeholder="Rechercher dans le répertoire libre" value="${esc(ui.lib.q)}"></div>
      <button class="btn btn-primary" data-act="cat-add-all" ${missing ? '' : 'disabled'}>${missing ? `Tout ajouter (${missing})` : 'Tout est ajouté'}</button>
    </div>
    <div class="tabs" role="group" aria-label="Thèmes">${['', ...CAT_TAGS].map((t) => `<button type="button" data-act="cat-tag" data-tag="${esc(t)}" aria-pressed="${(tag || '') === t}">${t || 'Tous les thèmes'}</button>`).join('')}</div>
    ${list.length ? `<ul class="songlist">${list.map(catalogRow).join('')}</ul>` : `<div class="empty"><p>Aucune chanson du répertoire libre ne correspond.</p></div>`}
    <section class="stack" aria-labelledby="h-freelib">
      <h2 id="h-freelib">Autres bibliothèques libres de droits</h2>
      <p class="muted" style="font-size:14px">Ces sites publient légalement des œuvres du domaine public. Leurs partitions sont des PDF ou des textes : copiez les paroles et collez-les dans Harmonia pour créer une fiche.</p>
      <div class="web-grid">${FREE_LIBRARIES.map((l) => `<a class="web-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span class="wl-name">${esc(l.name)}${icon('next', 'sm')}</span><span class="wl-desc">${esc(l.desc)}</span><span class="chip sage">Libre de droits</span></a>`).join('')}</div>
    </section>`;
}
function addFromCatalog(c) {
  if (catalogOwned(c)) return null;
  const s = makeSong({ title: c.title, artist: c.artist, key: c.key, capo: c.capo || '', difficulty: c.difficulty, structure: c.structure, body: c.body, notes: c.notes || CAT_NOTE, catalogId: c.id, source: 'catalog' }, 'catalog');
  store.songs.push(s);
  return s;
}

/* ---------- Fenêtre d'importation (collage intelligent + fichiers) ---------- */
const imp = { mode: 'paste', text: '', res: null, over: {} };
function openImport(opts = {}) {
  imp.mode = opts.mode || 'paste';
  imp.text = opts.text || '';
  imp.over = {};
  imp.res = imp.text ? analyzePaste(imp.text) : null;
  openModal(`<div class="mdl">
    <div class="mdl-head"><div><h2>Importer une chanson</h2><p class="muted" style="font-size:14px">Collez une partition copiée sur le web, lisez un PDF ou une capture d’écran, ou choisissez des fichiers (texte, ChordPro, JSON).</p></div>
      <button class="iconbtn sm" data-act="modal-close" aria-label="Fermer">${icon('close', 'sm')}</button></div>
    <div class="seg" role="group" aria-label="Mode d’importation">
      <button type="button" data-act="imp-mode" data-mode="paste" aria-pressed="${imp.mode === 'paste'}">Coller du texte</button>
      <button type="button" data-act="imp-mode" data-mode="scan" aria-pressed="${imp.mode === 'scan'}">PDF, image ou partition</button>
      <button type="button" data-act="imp-mode" data-mode="file" aria-pressed="${imp.mode === 'file'}">Fichiers</button>
    </div>
    <div id="imp-scan-pane" ${imp.mode === 'scan' ? '' : 'hidden'} class="stack">
      <div class="drop" id="scan-drop">
        ${icon('file', 'lg')}
        <p>Déposez un PDF, une capture d’écran, une photo, ou une partition MusicXML (.musicxml, .mxl) ; vous pouvez aussi coller une image (Ctrl+V)</p>
        <label class="btn btn-primary sm" for="scan-file">Choisir un fichier</label>
        <input id="scan-file" type="file" class="sr-only" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,image/gif,.musicxml,.mxl,.xml,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml">
        <div id="scan-progress" class="scan-progress" hidden><progress id="scan-bar" max="100" value="0"></progress><p id="scan-status" class="help" role="status"></p></div>
      </div>
      <p class="help">PDF avec du texte : lu directement, accords replacés au-dessus des bonnes syllabes. PDF scanné, capture d’écran ou photo : reconnaissance de texte (OCR) sur votre appareil, en français et en anglais. Au premier usage, Harmonia télécharge le module nécessaire (environ 1 Mo pour les PDF, environ 9 Mo pour la reconnaissance, langues française et anglaise comprises) ; le fichier lui-même n’est envoyé nulle part. Vérifiez toujours l’aperçu : la reconnaissance peut confondre certains accords.</p>
      <p class="help"><strong>Partition pour piano ou chant :</strong> les symboles d’accords et les paroles écrits sur la partition sont lus, syllabes recollées. Les notes dessinées sur les portées d’un PDF ne sont pas lues : convertissez d’abord le PDF en MusicXML avec un logiciel de reconnaissance de partitions (par exemple Audiveris, libre et gratuit) ou exportez la partition en MusicXML depuis votre logiciel de partition. Harmonia en tire alors les accords (écrits, ou déduits des notes jouées), les paroles et la mélodie en tablature, transposables et adaptés à votre instrument.</p>
    </div>
    <div id="imp-paste-pane" ${imp.mode === 'paste' ? '' : 'hidden'} class="stack">
      <div class="field"><label for="imp-paste">Partition copiée</label>
        <textarea id="imp-paste" class="textarea mono" rows="8" spellcheck="false" placeholder="Sur la page de la chanson, sélectionnez le titre, les accords et les paroles, copiez, puis collez ici.">${esc(imp.text)}</textarea></div>
      <div id="imp-analysis"></div>
    </div>
    <div id="imp-file-pane" ${imp.mode === 'file' ? '' : 'hidden'}>
      <div class="drop" id="drop">
        ${icon('file', 'lg')}
        <p>Déposez un ou plusieurs fichiers ici</p>
        <label class="btn btn-primary sm" for="imp-file">Choisir des fichiers</label>
        <input id="imp-file" type="file" class="sr-only" multiple accept=".txt,.cho,.chopro,.chordpro,.crd,.pro,.json,.musicxml,.mxl,.xml,text/plain,application/json">
        <p class="help">Texte avec accords au-dessus des paroles, ChordPro (.cho, .chopro, .pro, plusieurs chansons séparées par {new_song}), ou sauvegarde JSON Harmonia.</p>
      </div>
    </div>
    <div id="imp-msg" role="status"></div>
    <div class="mdl-foot" id="imp-foot" ${imp.mode === 'paste' ? '' : 'hidden'}>
      <button class="btn btn-ghost" data-act="modal-close">Fermer</button>
      <button class="btn btn-soft" data-act="imp-editor">${icon('edit', 'sm')}Retoucher dans l’éditeur</button>
      <button class="btn btn-primary" data-act="imp-create">${icon('check', 'sm')}Créer la fiche</button>
    </div>
  </div>`);
  modal.classList.add('wide');
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (ev) => { ev.preventDefault(); handleFiles(ev.dataTransfer.files); });
  $('#imp-file').addEventListener('change', (ev) => handleFiles(ev.target.files));
  const sd = $('#scan-drop');
  ['dragenter', 'dragover'].forEach((e) => sd.addEventListener(e, (ev) => { ev.preventDefault(); sd.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((e) => sd.addEventListener(e, () => sd.classList.remove('over')));
  sd.addEventListener('drop', (ev) => { ev.preventDefault(); const f = ev.dataTransfer.files[0]; if (f) handleScan(f); });
  $('#scan-file').addEventListener('change', (ev) => { const f = ev.target.files[0]; if (f) handleScan(f); ev.target.value = ''; });
  if (opts.scanFile) handleScan(opts.scanFile);
  let t = 0;
  $('#imp-paste').addEventListener('input', (ev) => { clearTimeout(t); t = setTimeout(() => { imp.text = ev.target.value; imp.res = imp.text.trim() ? analyzePaste(imp.text) : null; renderAnalysis(); }, 160); });
  renderAnalysis();
  if (imp.mode === 'paste') $('#imp-paste').focus();
}
function setImpMode(mode) {
  imp.mode = mode;
  $$('[data-act="imp-mode"]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === mode));
  $('#imp-paste-pane').hidden = mode !== 'paste';
  $('#imp-scan-pane').hidden = mode !== 'scan';
  $('#imp-file-pane').hidden = mode !== 'file';
  $('#imp-foot').hidden = mode !== 'paste';
}
/** Lit un PDF ou une image, puis bascule sur le collage intelligent avec le texte obtenu. */
/** Partition MusicXML : conversion en fiche (accords, paroles, mélodie), puis aperçu. */
async function handleMusicXml(file, progress) {
  progress('Lecture de la partition…', 0.3);
  const { song, info } = await musicXmlFileToSong(file);
  const head = [`{title: ${song.title}}`, song.artist ? `{artist: ${song.artist}}` : '', song.key ? `{key: ${song.key}}` : ''].filter(Boolean).join('\n');
  const text = head + '\n\n' + song.body;
  imp.text = text; imp.res = analyzePaste(text); imp.over = {}; imp.extraNotes = song.notes;
  imp.res.structure = song.structure;
  setImpMode('paste');
  $('#imp-paste').value = text;
  renderAnalysis();
  impMsg(`Partition « ${esc(file.name)} » lue : ${info.measures} mesures, ${info.chords} changement${info.chords > 1 ? 's' : ''} d’accord ${info.inferred ? '<strong>déduits des notes</strong> (vérifiez-les à l’écoute)' : 'repris de la partition'}${info.lyrics ? ', paroles' : ', sans paroles'}${info.tab ? ', mélodie en tablature' : ''}. Une fois la fiche créée, vous pourrez la transposer et changer d’instrument.`, info.inferred ? 'warn' : 'ok');
}
async function handleScan(file) {
  if (imp.busy) return;
  setImpMode('scan');
  const box = $('#scan-progress'), bar = $('#scan-bar'), st = $('#scan-status');
  $('#imp-msg').innerHTML = '';
  imp.busy = true; box.hidden = false; bar.value = 0; st.textContent = 'Préparation…';
  const progress = (msg, f) => { if (st) st.textContent = msg; if (bar) bar.value = Math.round(clamp(f, 0, 1) * 100); };
  try {
    if (/\.(musicxml|mxl|xml)$/i.test(file.name)) { await handleMusicXml(file, progress); return; }
    const r = await documentToText(file, progress);
    imp.text = r.text; imp.res = analyzePaste(r.text); imp.over = {}; imp.extraNotes = '';
    if (!imp.res.title) imp.over.title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    setImpMode('paste');
    $('#imp-paste').value = r.text;
    renderAnalysis();
    impMsg(`Texte ${r.method === 'ocr' ? 'reconnu dans' : 'extrait de'} « ${esc(file.name)} »${r.pages > 1 ? ` (${r.pages} pages)` : ''}. ${r.method === 'ocr' ? 'La reconnaissance peut se tromper, surtout sur les accords : vérifiez l’aperçu et corrigez le texte ci-dessus si besoin.' : 'Vérifiez l’aperçu avant de créer la fiche.'}${r.truncated ? ` Seules les ${MAX_PDF_PAGES} premières pages ont été lues.` : ''}${imp.res.hasChords ? '' : '<br><strong>Aucun accord n’a été trouvé.</strong> S’il s’agit d’une partition en notation musicale (portées), convertissez-la en MusicXML (par exemple avec Audiveris, gratuit) puis importez ce fichier : Harmonia déduira les accords des notes.'}`, r.method === 'ocr' || !imp.res.hasChords ? 'warn' : 'ok');
  } catch (e) {
    impMsg(esc(e && e.message || 'La lecture du fichier a échoué.') + ' Votre bibliothèque n’a pas été modifiée.', 'err');
  } finally {
    imp.busy = false; if (box) box.hidden = true;
  }
}
function impValue(k) { return imp.over[k] !== undefined ? imp.over[k] : (imp.res ? imp.res[k] : ''); }
function renderAnalysis() {
  const box = $('#imp-analysis');
  if (!box) return;
  const r = imp.res;
  if (!r) { box.innerHTML = `<p class="help">Harmonia repère le titre, l’artiste, la tonalité et le capo, place les accords au-dessus des bonnes syllabes, reconnaît les sections (couplet, refrain…) et les tablatures, et retire les menus et boutons copiés par erreur.</p>`; return; }
  const summary = [`${r.lineCount} ligne${r.lineCount > 1 ? 's' : ''}`, r.hasChords ? `${r.chordCount} accord${r.chordCount > 1 ? 's' : ''} différent${r.chordCount > 1 ? 's' : ''}` : 'aucun accord détecté', `format ${r.format}`];
  box.innerHTML = `<div class="stack">
    <div class="ed-meta">
      <div class="field"><label for="ia-title">Titre</label><input id="ia-title" class="input" data-imp="title" value="${esc(impValue('title'))}" placeholder="Titre non détecté"></div>
      <div class="field"><label for="ia-artist">Artiste</label><div class="row" style="flex-wrap:nowrap;gap:6px"><input id="ia-artist" class="input" data-imp="artist" value="${esc(impValue('artist'))}" placeholder="Artiste non détecté">
        <button type="button" class="iconbtn" data-act="imp-swap" aria-label="Inverser titre et artiste" title="Inverser titre et artiste">⇄</button></div></div>
      <div class="field"><label for="ia-key">Tonalité</label><input id="ia-key" class="input" data-imp="key" value="${esc(impValue('key'))}" placeholder="Non indiquée" maxlength="6"></div>
      <div class="field"><label for="ia-capo">Capo</label><input id="ia-capo" class="input num" data-imp="capo" value="${esc(impValue('capo'))}" placeholder="Sans capo" inputmode="numeric" maxlength="2"></div>
    </div>
    ${r.ambiguous ? `<div class="notice">${icon('info')}<p>Titre et artiste étaient séparés par un tiret : vérifiez qu’ils ne sont pas inversés (bouton ⇄).</p></div>` : ''}
    ${!r.hasChords ? `<div class="notice warn">${icon('info')}<p>Aucun accord n’a été reconnu. La fiche contiendra seulement les paroles ; vous pourrez ajouter les accords dans l’éditeur.</p></div>` : ''}
    <p class="help num">${summary.join(' · ')}${r.removed.length ? ` · ${r.removed.length} ligne${r.removed.length > 1 ? 's' : ''} retirée${r.removed.length > 1 ? 's' : ''}` : ''}</p>
    ${r.removed.length ? `<details class="help"><summary>Voir les lignes retirées</summary><ul style="margin:6px 0 0;padding-left:18px">${r.removed.slice(0, 40).map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details>` : ''}
    <div class="field"><span class="label">Aperçu</span><div class="preview imp-preview"><div class="rd-body">${renderSongBody(r.body, 0, false, false) || '<p class="muted">Rien à afficher.</p>'}</div></div></div>
  </div>`;
  $$('[data-imp]', box).forEach((i) => i.addEventListener('input', () => { imp.over[i.dataset.imp] = i.value; }));
}
function impSong() {
  const r = imp.res;
  const key = String(impValue('key') || '').trim();
  return makeSong({
    title: String(impValue('title') || '').trim() || 'Chanson importée', artist: String(impValue('artist') || '').trim(),
    key: parseChord(key) ? key : '', capo: /^\d{1,2}$/.test(String(impValue('capo') || '').trim()) ? String(Number(impValue('capo'))) : '',
    difficulty: r.difficulty, structure: r.structure || '', body: r.body, notes: [r.notes, imp.extraNotes].filter(Boolean).join('\n'), source: 'import'
  }, 'import');
}

