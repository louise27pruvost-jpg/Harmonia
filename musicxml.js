/* Harmonia — import des partitions au format MusicXML (.musicxml, .xml) et MusicXML compressé (.mxl).
   C'est le format d'échange des logiciels de partition (MuseScore, Finale, Sibelius, Dorico…) et des
   outils de reconnaissance de partitions PDF (Audiveris, import PDF de MuseScore).
   - Accords : repris des symboles d'accords de la partition s'il y en a, sinon déduits des notes
     jouées (toutes portées confondues, mesure par mesure, demi-mesure si l'harmonie change).
   - Paroles : syllabes de la mélodie, accords placés sur la syllabe chantée au moment de l'accord.
   - Mélodie : ligne la plus aiguë de la première portée, écrite en tablature de guitare
     (convertible ensuite vers les autres instruments). */
'use strict';

/* ---------- Lecteur XML minimal (aucune entité externe n'est chargée) ---------- */
function parseXml(src) {
  const root = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  const ent = (t) => t.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()]));
  let m;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[3]) { if (stack.length > 1) stack.pop(); }
    else if (m[4]) {
      const attrs = {};
      (m[5] || '').replace(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g, (a, k, v, d1, d2) => { attrs[k] = ent(d1 !== undefined ? d1 : d2); return ''; });
      const node = { name: m[4], attrs, children: [], text: '' };
      top.children.push(node);
      if (!m[6]) stack.push(node);
    } else if (m[7] !== undefined) top.text += ent(m[7]);
  }
  return root;
}
const xKids = (n, name) => (n ? n.children.filter((c) => c.name === name) : []);
const xKid = (n, name) => (n ? n.children.find((c) => c.name === name) || null : null);
const xText = (n, name) => { const k = name ? xKid(n, name) : n; return k ? k.text.trim() : ''; };
const xPath = (n, ...names) => names.reduce((a, nm) => xKid(a, nm), n);

/* ---------- MusicXML compressé (.mxl = archive zip) ---------- */
async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Ce navigateur ne sait pas ouvrir les fichiers .mxl compressés : exportez la partition en .musicxml non compressé.');
  const ds = new DecompressionStream('deflate-raw');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}
async function unzipEntries(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Ce fichier .mxl n’est pas une archive valide.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};
  const dec = new TextDecoder();
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    const lnl = dv.getUint16(local + 26, true), lxl = dv.getUint16(local + 28, true);
    const data = u8.subarray(local + 30 + lnl + lxl, local + 30 + lnl + lxl + csize);
    files[name] = { method, data };
    p += 46 + nlen + xlen + clen;
  }
  return files;
}
async function mxlToXml(buf) {
  const files = await unzipEntries(buf);
  const read = async (f) => new TextDecoder().decode(f.method === 0 ? f.data : await inflateRaw(f.data));
  let target = null;
  if (files['META-INF/container.xml']) {
    const c = parseXml(await read(files['META-INF/container.xml']));
    const find = (n) => (n.name === 'rootfile' ? n : n.children.map(find).find(Boolean));
    const rf = find(c);
    if (rf && files[rf.attrs['full-path']]) target = rf.attrs['full-path'];
  }
  if (!target) target = Object.keys(files).find((n) => /\.(musicxml|xml)$/i.test(n) && !/^META-INF\//.test(n));
  if (!target) throw new Error('Aucune partition MusicXML n’a été trouvée dans cette archive .mxl.');
  return read(files[target]);
}

/* ---------- Lecture de la partition ---------- */
const STEP_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const KIND_SUFFIX = {
  major: '', minor: 'm', augmented: 'aug', diminished: 'dim', dominant: '7', 'major-seventh': 'maj7', 'minor-seventh': 'm7',
  'diminished-seventh': 'dim7', 'augmented-seventh': 'aug7', 'half-diminished': 'm7b5', 'major-minor': 'm(maj7)', 'major-sixth': '6',
  'minor-sixth': 'm6', 'dominant-ninth': '9', 'major-ninth': 'maj9', 'minor-ninth': 'm9', 'dominant-11th': '11', 'dominant-13th': '13',
  'suspended-second': 'sus2', 'suspended-fourth': 'sus4', power: '5'
};
const FIFTHS_MAJOR = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const FIFTHS_MINOR = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];

function readScore(xml) {
  const doc = parseXml(xml);
  const score = doc.children.find((c) => c.name === 'score-partwise');
  if (!score) {
    if (doc.children.some((c) => c.name === 'score-timewise')) throw new Error('Les partitions MusicXML « timewise » ne sont pas prises en charge : réexportez en MusicXML standard.');
    throw new Error('Ce fichier n’est pas une partition MusicXML.');
  }
  const title = xText(xPath(score, 'work'), 'work-title') || xText(score, 'movement-title') ||
    (xKids(score, 'credit').map((c) => xText(c, 'credit-words')).find(Boolean) || '');
  const creators = xKids(xKid(score, 'identification'), 'creator');
  const composer = (creators.find((c) => c.attrs.type === 'composer') || creators[0] || { text: '' }).text.trim();
  const partNames = {};
  xKids(xKid(score, 'part-list'), 'score-part').forEach((sp) => { partNames[sp.attrs.id] = xText(sp, 'part-name'); });
  let divisions = 1, beats = 4, beatType = 4, fifths = null, mode = 'major';
  const parts = xKids(score, 'part').map((part) => {
    let t0 = 0; // en noires
    const measures = xKids(part, 'measure').map((meas, mi) => {
      const notes = [], harmonies = [];
      let pos = 0, lastOnset = 0, maxPos = 0;
      for (const el of meas.children) {
        if (el.name === 'attributes') {
          const d = Number(xText(el, 'divisions')); if (d) divisions = d;
          const k = xKid(el, 'key'); if (k && xText(k, 'fifths') !== '') { fifths = Number(xText(k, 'fifths')); mode = xText(k, 'mode') || 'major'; }
          const ti = xKid(el, 'time'); if (ti && xText(ti, 'beats')) { beats = Number(xText(ti, 'beats').split('+')[0]) || 4; beatType = Number(xText(ti, 'beat-type')) || 4; }
        } else if (el.name === 'backup') pos -= Number(xText(el, 'duration')) || 0;
        else if (el.name === 'forward') pos += Number(xText(el, 'duration')) || 0;
        else if (el.name === 'harmony') {
          const rs = xText(xKid(el, 'root'), 'root-step');
          if (!rs) { if (xText(el, 'kind') === 'none') harmonies.push({ onset: pos / divisions, symbol: 'N.C.' }); continue; }
          const ra = Number(xText(xKid(el, 'root'), 'root-alter')) || 0;
          const kindNode = xKid(el, 'kind');
          let suffix = KIND_SUFFIX[kindNode ? kindNode.text.trim() : 'major'];
          if (suffix === undefined) suffix = kindNode && kindNode.attrs.text ? kindNode.attrs.text : '';
          const bs = xText(xKid(el, 'bass'), 'bass-step'), ba = Number(xText(xKid(el, 'bass'), 'bass-alter')) || 0;
          const off = Number(xText(el, 'offset')) || 0;
          harmonies.push({ onset: (pos + off) / divisions, root: (STEP_PC[rs] + ra + 12) % 12, rootName: rs + (ra > 0 ? '#' : ra < 0 ? 'b' : ''), suffix, bass: bs ? (STEP_PC[bs] + ba + 12) % 12 : null, bassName: bs ? bs + (ba > 0 ? '#' : ba < 0 ? 'b' : '') : null });
        } else if (el.name === 'note') {
          const dur = Number(xText(el, 'duration')) || 0;
          const isChord = !!xKid(el, 'chord');
          const isGrace = !!xKid(el, 'grace');
          const onset = isChord ? lastOnset : pos;
          const pitch = xKid(el, 'pitch');
          if (pitch && !isGrace) {
            const midi = 12 * (Number(xText(pitch, 'octave')) + 1) + STEP_PC[xText(pitch, 'step')] + (Number(xText(pitch, 'alter')) || 0);
            const lyr = xKids(el, 'lyric').find((l) => !l.attrs.number || l.attrs.number === '1');
            const tieStop = xKids(el, 'tie').some((t) => t.attrs.type === 'stop');
            notes.push({ midi, onset: onset / divisions, dur: dur / divisions, staff: Number(xText(el, 'staff')) || 1, voice: xText(el, 'voice') || '1', tieStop,
              lyric: lyr ? { text: xKids(lyr, 'text').map((t) => t.text).join(''), syllabic: xText(lyr, 'syllabic') || 'single' } : null });
          }
          if (!isChord && !isGrace) { lastOnset = pos; pos += dur; }
        }
        maxPos = Math.max(maxPos, pos);
      }
      const nominal = (beats * 4) / beatType;
      const length = meas.attrs.implicit === 'yes' ? (maxPos / divisions || nominal) : Math.max(maxPos / divisions, nominal);
      const m = { index: mi, number: meas.attrs.number || String(mi + 1), start: t0, length, notes, harmonies, beats, beatType };
      t0 += length;
      return m;
    });
    return { id: part.attrs.id, name: partNames[part.attrs.id] || '', measures };
  });
  if (!parts.length || !parts[0].measures.length) throw new Error('Cette partition ne contient aucune mesure.');
  const minor = mode === 'minor';
  const key = fifths === null ? '' : (minor ? FIFTHS_MINOR : FIFTHS_MAJOR)[fifths + 7] + (minor ? 'm' : '');
  return { title, composer, parts, key, fifths: fifths ?? 0, minor };
}

/* ---------- Déduction des accords à partir des notes ---------- */
const INFER_TEMPLATES = [
  ['', [0, 4, 7], 0], ['m', [0, 3, 7], 0], ['7', [0, 4, 7, 10], 0.08], ['m7', [0, 3, 7, 10], 0.08], ['maj7', [0, 4, 7, 11], 0.1],
  ['dim', [0, 3, 6], 0.1], ['sus4', [0, 5, 7], 0.12], ['sus2', [0, 2, 7], 0.14], ['5', [0, 7], 0.2]
];
/** Choisit l'accord qui explique le mieux un ensemble de notes pondérées par leur durée. */
function inferChord(weights, bassPc) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let best = null;
  for (let r = 0; r < 12; r++) for (const [suf, iv, cx] of INFER_TEMPLATES) {
    const tones = iv.map((t) => (r + t) % 12);
    let inside = 0, outside = 0, missing = 0;
    for (let pc = 0; pc < 12; pc++) { if (tones.includes(pc)) inside += weights[pc]; else outside += weights[pc]; }
    for (const t of tones) if (weights[t] < total * 0.04) missing++;
    if (weights[r] < total * 0.04) continue; // la fondamentale doit sonner
    let score = inside - 0.85 * outside - missing * total * 0.22 - cx * total;
    if (bassPc === r) score += total * 0.18;
    if (!best || score > best.score) best = { root: r, suffix: suf, score, conf: (inside - outside) / total };
  }
  return best;
}
function segmentWeights(notes, a, b) {
  const w = new Array(12).fill(0);
  let bass = null;
  for (const n of notes) {
    const ov = Math.min(n.onset + n.dur, b) - Math.max(n.onset, a);
    if (ov <= 0) continue;
    w[n.midi % 12] += ov * (n.onset >= a - 1e-6 ? 1 : 0.6);
    if (!bass || n.midi < bass.midi) bass = n;
  }
  return { w, bassPc: bass ? bass.midi % 12 : null };
}
function chordName(c, flats) {
  return spell(c.root, flats) + c.suffix + (c.bass != null && c.bass !== c.root ? '/' + spell(c.bass, flats) : '');
}
/** Liste chronologique des accords : écrits dans la partition, ou déduits (mesure ou demi-mesure). */
function scoreChords(score) {
  const flats = score.fifths < 0;
  const written = [];
  score.parts.forEach((p) => p.measures.forEach((m) => m.harmonies.forEach((h) => written.push({
    time: m.start + h.onset, measure: m.index,
    name: h.symbol || (h.rootName + h.suffix + (h.bassName ? '/' + h.bassName : ''))
  }))));
  if (written.length) {
    const sorted = written.sort((a, b) => a.time - b.time).filter((c, i, arr) => i === 0 || c.name !== arr[i - 1].name);
    return { chords: sorted, inferred: false };
  }
  const out = [];
  const nMeas = score.parts[0].measures.length;
  let prev = null;
  for (let mi = 0; mi < nMeas; mi++) {
    const ms = score.parts.map((p) => p.measures[mi]).filter(Boolean);
    const m = ms[0];
    const notes = ms.flatMap((x) => x.notes.map((n) => ({ ...n, onset: n.onset })));
    const len = m.length;
    const whole = segmentWeights(notes, 0, len);
    const cw = inferChord(whole.w, whole.bassPc);
    let segs = cw ? [{ t: 0, c: cw }] : [];
    if (len >= 2 && (m.beats % 2 === 0 || m.beats === 6)) {
      const h1 = segmentWeights(notes, 0, len / 2), h2 = segmentWeights(notes, len / 2, len);
      const c1 = inferChord(h1.w, h1.bassPc), c2 = inferChord(h2.w, h2.bassPc);
      if (c1 && c2 && (c1.root !== c2.root || c1.suffix !== c2.suffix) && c1.conf > 0.45 && c2.conf > 0.45 && (!cw || c1.conf + c2.conf > 2 * cw.conf + 0.1)) segs = [{ t: 0, c: c1 }, { t: len / 2, c: c2 }];
    }
    for (const sg of segs) {
      const bassNote = segmentWeights(notes, sg.t, sg.t + len / segs.length).bassPc;
      const c = { ...sg.c, bass: bassNote !== null && bassNote !== sg.c.root && [3, 4, 7, 10, 11].includes((bassNote - sg.c.root + 12) % 12) ? bassNote : null };
      const name = chordName(c, flats);
      if (name !== prev) out.push({ time: m.start + sg.t, measure: mi, name });
      prev = name;
    }
  }
  return { chords: out, inferred: true };
}

/* ---------- Paroles et mélodie ---------- */
function melodyNotes(score) {
  // partie et portée contenant des paroles en priorité, sinon première portée de la première partie
  const withLyrics = score.parts.find((p) => p.measures.some((m) => m.notes.some((n) => n.lyric)));
  const part = withLyrics || score.parts[0];
  const staff = withLyrics ? (part.measures.flatMap((m) => m.notes).find((n) => n.lyric) || {}).staff || 1 : 1;
  const out = [];
  for (const m of part.measures) {
    const byOnset = new Map();
    for (const n of m.notes) {
      if (n.staff !== staff) continue;
      const k = n.onset.toFixed(4);
      if (!byOnset.has(k) || byOnset.get(k).midi < n.midi) byOnset.set(k, n);
    }
    [...byOnset.values()].sort((a, b) => a.onset - b.onset).forEach((n) => out.push({ ...n, time: m.start + n.onset, measure: m.index }));
  }
  return out;
}
function lyricsWithChords(score, chords) {
  const mel = melodyNotes(score).filter((n) => n.lyric && n.lyric.text);
  if (!mel.length) return null;
  const lines = []; let cur = '', curMeasures = new Set(), ci = 0, prevSyll = 'single', current = null;
  const flush = () => { if (cur.trim()) lines.push(cur.trim()); cur = ''; curMeasures = new Set(); };
  mel.forEach((n, i) => {
    let tag = '';
    while (ci < chords.length && chords[ci].time <= n.time + 1e-6) { tag += `[${chords[ci].name}]`; current = chords[ci].name; ci++; }
    if (!cur && !tag && current) tag = `[${current}]`; // rappel de l'accord en cours en début de ligne
    const joinPrev = prevSyll === 'begin' || prevSyll === 'middle';
    cur += (cur && !joinPrev ? ' ' : '') + tag + n.lyric.text;
    prevSyll = n.lyric.syllabic;
    curMeasures.add(n.measure);
    const next = mel[i + 1];
    const wordEnd = n.lyric.syllabic === 'single' || n.lyric.syllabic === 'end';
    const punct = /[.,;:!?…]$/.test(n.lyric.text);
    if (wordEnd && next && ((curMeasures.size >= 4 && next.measure !== n.measure) || (punct && curMeasures.size >= 2) || curMeasures.size >= 8)) flush();
  });
  // accords restants après la dernière syllabe
  if (ci < chords.length) cur += ' ' + chords.slice(ci).map((c) => `[${c.name}]`).join(' ');
  flush();
  return lines;
}
function chordGrid(score, chords) {
  const nMeas = score.parts[0].measures.length;
  const lines = [];
  for (let a = 0; a < nMeas; a += 4) {
    const b = Math.min(nMeas, a + 4);
    const cs = chords.filter((c) => c.measure >= a && c.measure < b);
    if (!cs.length) continue;
    lines.push(`{comment: Mesures ${a + 1} à ${b}}`);
    lines.push(cs.map((c) => `[${c.name}]`).join('  '));
  }
  return lines;
}
const TAB_STRINGS_GUITAR = [64, 59, 55, 50, 45, 40];
function melodyTab(score) {
  const mel = melodyNotes(score).filter((n) => !n.tieStop);
  if (mel.length < 2) return null;
  let shifted = 0, prev = 2;
  const placed = mel.map((n) => {
    for (const oct of [0, -12, 12, -24, 24]) {
      const m = n.midi + oct;
      const c = TAB_STRINGS_GUITAR.map((sm, si) => ({ si, fret: m - sm })).filter((x) => x.fret >= 0 && x.fret <= 15);
      if (c.length) {
        c.sort((x, y) => Math.abs(x.fret - prev) + x.fret * 0.2 - (Math.abs(y.fret - prev) + y.fret * 0.2));
        if (oct) shifted++;
        prev = c[0].fret;
        return { ...c[0], measure: n.measure };
      }
    }
    return null;
  }).filter(Boolean);
  const names = ['e', 'B', 'G', 'D', 'A', 'E'];
  const systems = [];
  let rows = names.map((nm) => nm + '|'), measInLine = 0, last = placed.length ? placed[0].measure : 0;
  const closeBar = () => { rows = rows.map((r) => r + '-|'); };
  placed.forEach((p, i) => {
    if (p.measure !== last) {
      closeBar(); measInLine++; last = p.measure;
      if (measInLine >= 4) { systems.push(rows.join('\n')); rows = names.map((nm) => nm + '|'); measInLine = 0; }
    }
    const t = String(p.fret);
    rows = rows.map((r, si) => r + (si === p.si ? ('-' + t).padEnd(3, '-') : '---'));
    if (i === placed.length - 1) closeBar();
  });
  if (rows[0].length > 2) systems.push(rows.join('\n'));
  return { text: systems.join('\n\n'), shifted };
}

/** Transforme une partition MusicXML en fiche Harmonia (accords, paroles, tablature de la mélodie). */
function musicXmlToSong(xml, fallbackTitle) {
  const score = readScore(xml);
  const { chords, inferred } = scoreChords(score);
  const lyr = chords.length ? lyricsWithChords(score, chords) : lyricsWithChords(score, []);
  const tab = melodyTab(score);
  const body = [];
  if (lyr && lyr.length) { body.push('{start_of_verse: Paroles et accords}'); body.push(...lyr); body.push('{end_of_verse}'); }
  else if (chords.length) { body.push('{comment: Grille d’accords}'); body.push(...chordGrid(score, chords)); }
  if (tab) { body.push(''); body.push('{comment: Mélodie (tablature de guitare)}'); body.push('{start_of_tab}'); body.push(tab.text); body.push('{end_of_tab}'); }
  const notes = [
    `Importé d’une partition MusicXML (${score.parts.length} partie${score.parts.length > 1 ? 's' : ''}${score.parts.map((p) => p.name).filter(Boolean).length ? ' : ' + score.parts.map((p) => p.name).filter(Boolean).join(', ') : ''}).`,
    chords.length ? (inferred ? 'Accords déduits des notes de la partition, mesure par mesure : vérifiez-les à l’écoute.' : 'Accords repris des symboles d’accords de la partition.') : 'Aucun accord n’a pu être établi.',
    tab ? `Mélodie de la première portée écrite en tablature${tab.shifted ? ` (${tab.shifted} note${tab.shifted > 1 ? 's' : ''} déplacée${tab.shifted > 1 ? 's' : ''} d’une octave)` : ''}.` : ''
  ].filter(Boolean).join('\n');
  return {
    song: { title: score.title || fallbackTitle || 'Partition importée', artist: score.composer, key: parseChord(score.key) ? score.key : '', body: body.join('\n'), notes, structure: lyr ? 'Paroles et accords – Mélodie' : 'Grille – Mélodie', source: 'import' },
    info: { chords: chords.length, inferred, lyrics: !!(lyr && lyr.length), tab: !!tab, measures: score.parts[0].measures.length, parts: score.parts.length }
  };
}
async function musicXmlFileToSong(file) {
  const buf = await file.arrayBuffer();
  const u8 = new Uint8Array(buf);
  const xml = u8[0] === 0x50 && u8[1] === 0x4b ? await mxlToXml(buf) : new TextDecoder().decode(u8);
  return musicXmlToSong(xml, file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
}
