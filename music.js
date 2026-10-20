/* Harmonia — fonctions musicales */
'use strict';
/* ===================================================================
   Théorie musicale : notes, accords, transposition
   =================================================================== */
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FR_NOTES = { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

function pcOf(note) {
  let i = LETTER_PC[note[0]];
  if (i === undefined) return null;
  if (note[1] === '#') i++; else if (note[1] === 'b') i--;
  return (i + 12) % 12;
}
function parseChord(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/);
  if (!m) return null;
  return { root: m[1], suffix: m[2], bass: m[3] || null };
}
function spell(pc, flats) { return (flats ? FLATS : SHARPS)[((pc % 12) + 12) % 12]; }
function transposeChord(raw, n, flats) {
  if (!n) return raw;
  const p = parseChord(raw);
  if (!p) return raw;
  let out = spell(pcOf(p.root) + n, flats) + p.suffix;
  if (p.bass) out += '/' + spell(pcOf(p.bass) + n, flats);
  return out;
}
function isMinorSuffix(suf) { return /^(m(?!aj)|min|-)/.test(suf || ''); }
const FLAT_MAJOR = new Set([5, 10, 3, 8, 1]);      // F Bb Eb Ab Db (Fa# plutôt que Solb)
const FLAT_MINOR = new Set([2, 7, 0, 5, 10, 3]);   // Dm Gm Cm Fm Bbm Ebm
function keyPrefersFlats(pc, minor) { return minor ? FLAT_MINOR.has(pc) : FLAT_MAJOR.has(pc); }
/** Retourne {flats, keyName} pour un décalage donné, à partir de la tonalité d'origine (ou du premier accord). */
function transposeContext(origKey, n, pref) {
  const p = parseChord(origKey || '');
  let keyName = null, flats;
  if (p) {
    const minor = isMinorSuffix(p.suffix);
    const pc = (pcOf(p.root) + n + 12) % 12;
    const auto = keyPrefersFlats(pc, minor);
    flats = pref === 'sharps' ? false : pref === 'flats' ? true : auto;
    keyName = n === 0 ? origKey : spell(pc, flats) + (minor ? 'm' : '');
  } else {
    flats = pref === 'flats';
  }
  return { flats, keyName };
}

/* ---------- Qualités d'accords reconnues ---------- */
const QUALITY_MAP = {
  '': 'maj', 'M': 'maj', 'maj': 'maj', 'major': 'maj',
  'm': 'm', 'min': 'm', '-': 'm', 'mi': 'm',
  '7': '7', 'dom7': '7',
  'm7': 'm7', 'min7': 'm7', '-7': 'm7', 'mi7': 'm7',
  'maj7': 'maj7', 'M7': 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', 'ma7': 'maj7', '7M': 'maj7',
  'sus2': 'sus2', 'sus4': 'sus4', 'sus': 'sus4',
  '7sus4': '7sus4', '7sus': '7sus4',
  'dim': 'dim', '°': 'dim', 'o': 'dim', 'dim7': 'dim7', '°7': 'dim7', 'o7': 'dim7',
  'aug': 'aug', '+': 'aug', '+5': 'aug',
  'add9': 'add9', 'add2': 'add9',
  '6': '6', 'm6': 'm6', 'min6': 'm6',
  '9': '9', '5': '5'
};
const QUALITY_FR = {
  maj: 'majeur', m: 'mineur', '7': 'septième', m7: 'mineur septième', maj7: 'septième majeure',
  sus2: 'suspendu 2', sus4: 'suspendu 4', '7sus4': 'septième suspendu 4', dim: 'diminué', dim7: 'septième diminuée',
  aug: 'augmenté', add9: 'neuvième ajoutée', '6': 'sixte', m6: 'mineur sixte', '9': 'neuvième', '5': 'quinte (power chord)'
};
function frNote(n) { return FR_NOTES[n[0]] + (n[1] === '#' ? ' dièse' : n[1] === 'b' ? ' bémol' : ''); }
function chordFullName(raw) {
  const p = parseChord(raw);
  if (!p) return null;
  const q = QUALITY_MAP[p.suffix.replace(/\s/g, '')];
  let s = frNote(p.root) + (q ? ' ' + QUALITY_FR[q] : (p.suffix ? ' ' + p.suffix : ''));
  if (p.bass) s += ', basse ' + frNote(p.bass);
  return s;
}

/* ---------- Bibliothèque de positions (cordes de la 6e grave à la 1re aiguë ; -1 = ne pas jouer) ---------- */
const OPEN = {
  '0:maj': [[-1, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0]],
  '0:7': [[-1, 3, 2, 3, 1, 0], [0, 3, 2, 4, 1, 0]],
  '0:maj7': [[-1, 3, 2, 0, 0, 0], [0, 3, 2, 0, 0, 0]],
  '0:add9': [[-1, 3, 2, 0, 3, 0], [0, 2, 1, 0, 3, 0]],
  '0:sus4': [[-1, 3, 3, 0, 1, 1], [0, 3, 4, 0, 1, 1]],
  '2:maj': [[-1, -1, 0, 2, 3, 2], [0, 0, 0, 1, 3, 2]],
  '2:m': [[-1, -1, 0, 2, 3, 1], [0, 0, 0, 2, 3, 1]],
  '2:7': [[-1, -1, 0, 2, 1, 2], [0, 0, 0, 2, 1, 3]],
  '2:m7': [[-1, -1, 0, 2, 1, 1], [0, 0, 0, 2, 1, 1]],
  '2:maj7': [[-1, -1, 0, 2, 2, 2], [0, 0, 0, 1, 2, 3]],
  '2:sus2': [[-1, -1, 0, 2, 3, 0], [0, 0, 0, 1, 3, 0]],
  '2:sus4': [[-1, -1, 0, 2, 3, 3], [0, 0, 0, 1, 3, 4]],
  '2:m6': [[-1, -1, 0, 2, 0, 1], [0, 0, 0, 2, 0, 1]],
  '2:5': [[-1, -1, 0, 2, 3, -1], [0, 0, 0, 1, 2, 0]],
  '2:dim7': [[-1, -1, 0, 1, 0, 1], [0, 0, 0, 1, 0, 2]],
  '4:maj': [[0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]],
  '4:m': [[0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]],
  '4:7': [[0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0]],
  '4:m7': [[0, 2, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0]],
  '4:maj7': [[0, 2, 1, 1, 0, 0], [0, 3, 1, 2, 0, 0]],
  '4:sus4': [[0, 2, 2, 2, 0, 0], [0, 2, 3, 4, 0, 0]],
  '4:7sus4': [[0, 2, 0, 2, 0, 0], [0, 2, 0, 3, 0, 0]],
  '4:m6': [[0, 2, 2, 0, 2, 0], [0, 1, 2, 0, 3, 0]],
  '4:5': [[0, 2, 2, -1, -1, -1], [0, 1, 2, 0, 0, 0]],
  '5:maj7': [[-1, -1, 3, 2, 1, 0], [0, 0, 3, 2, 1, 0]],
  '7:maj': [[3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]],
  '7:7': [[3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1]],
  '7:maj7': [[3, 2, 0, 0, 0, 2], [3, 2, 0, 0, 0, 1]],
  '7:6': [[3, 2, 0, 0, 0, 0], [2, 1, 0, 0, 0, 0]],
  '7:sus4': [[3, 3, 0, 0, 1, 3], [2, 3, 0, 0, 1, 4]],
  '9:maj': [[-1, 0, 2, 2, 2, 0], [0, 0, 1, 2, 3, 0]],
  '9:m': [[-1, 0, 2, 2, 1, 0], [0, 0, 2, 3, 1, 0]],
  '9:7': [[-1, 0, 2, 0, 2, 0], [0, 0, 2, 0, 3, 0]],
  '9:m7': [[-1, 0, 2, 0, 1, 0], [0, 0, 2, 0, 1, 0]],
  '9:maj7': [[-1, 0, 2, 1, 2, 0], [0, 0, 2, 1, 3, 0]],
  '9:sus2': [[-1, 0, 2, 2, 0, 0], [0, 0, 1, 2, 0, 0]],
  '9:sus4': [[-1, 0, 2, 2, 3, 0], [0, 0, 1, 2, 3, 0]],
  '9:7sus4': [[-1, 0, 2, 0, 3, 0], [0, 0, 2, 0, 3, 0]],
  '9:m6': [[-1, 0, 2, 2, 1, 2], [0, 0, 2, 3, 1, 4]],
  '9:6': [[-1, 0, 2, 2, 2, 2], [0, 0, 1, 1, 1, 1]],
  '9:add9': [[-1, 0, 2, 4, 2, 0], [0, 0, 1, 4, 2, 0]],
  '9:5': [[-1, 0, 2, 2, -1, -1], [0, 0, 1, 2, 0, 0]],
  '9:dim': [[-1, 0, 1, 2, 1, -1], [0, 0, 1, 3, 2, 0]],
  '11:7': [[-1, 2, 1, 2, 0, 2], [0, 2, 1, 3, 0, 4]]
};
/* Renversements courants vérifiés : clé "pc:qualité/pcBasse" */
const SLASH = {
  '0:maj/7': [[3, 3, 2, 0, 1, 0], [4, 3, 2, 0, 1, 0]],     // C/G
  '0:maj/4': [[0, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0]],     // C/E
  '2:maj/6': [[2, -1, 0, 2, 3, 2], [1, 0, 0, 2, 4, 3]],    // D/F#
  '2:maj/9': [[-1, 0, 0, 2, 3, 2], [0, 0, 0, 1, 3, 2]],    // D/A
  '7:maj/11': [[-1, 2, 0, 0, 0, 3], [0, 1, 0, 0, 0, 3]],   // G/B
  '9:m/7': [[3, 0, 2, 2, 1, 0], [4, 0, 2, 3, 1, 0]],       // Am/G
  '9:maj/1': [[-1, 4, 2, 2, 2, -1], [0, 3, 1, 1, 1, 0]]    // A/C#
};
/* Formes mobiles (barrés) : fondamentale sur la corde 6 (Mi), 5 (La) ou 4 (Ré) ; null = corde non jouée */
const MOVABLE = [
  { q: 'maj', s: 6, rel: [0, 2, 2, 1, 0, 0], fi: [1, 3, 4, 2, 1, 1] },
  { q: 'm', s: 6, rel: [0, 2, 2, 0, 0, 0], fi: [1, 3, 4, 1, 1, 1] },
  { q: '7', s: 6, rel: [0, 2, 0, 1, 0, 0], fi: [1, 3, 1, 2, 1, 1] },
  { q: 'm7', s: 6, rel: [0, 2, 0, 0, 0, 0], fi: [1, 3, 1, 1, 1, 1] },
  { q: 'sus4', s: 6, rel: [0, 2, 2, 2, 0, 0], fi: [1, 2, 3, 4, 1, 1] },
  { q: '7sus4', s: 6, rel: [0, 2, 0, 2, 0, 0], fi: [1, 3, 1, 4, 1, 1] },
  { q: '5', s: 6, rel: [0, 2, 2, null, null, null], fi: [1, 3, 4, 0, 0, 0] },
  { q: 'maj', s: 5, rel: [null, 0, 2, 2, 2, 0], fi: [0, 1, 2, 3, 4, 1] },
  { q: 'm', s: 5, rel: [null, 0, 2, 2, 1, 0], fi: [0, 1, 3, 4, 2, 1] },
  { q: '7', s: 5, rel: [null, 0, 2, 0, 2, 0], fi: [0, 1, 3, 1, 4, 1] },
  { q: 'm7', s: 5, rel: [null, 0, 2, 0, 1, 0], fi: [0, 1, 3, 1, 2, 1] },
  { q: 'maj7', s: 5, rel: [null, 0, 2, 1, 2, 0], fi: [0, 1, 3, 2, 4, 1] },
  { q: 'sus2', s: 5, rel: [null, 0, 2, 2, 0, 0], fi: [0, 1, 3, 4, 1, 1] },
  { q: 'sus4', s: 5, rel: [null, 0, 2, 2, 3, 0], fi: [0, 1, 2, 3, 4, 1] },
  { q: '7sus4', s: 5, rel: [null, 0, 2, 0, 3, 0], fi: [0, 1, 3, 1, 4, 1] },
  { q: 'add9', s: 5, rel: [null, 0, 2, 4, 2, 0], fi: [0, 1, 2, 4, 3, 1] },
  { q: '6', s: 5, rel: [null, 0, 2, 2, 2, 2], fi: [0, 1, 3, 3, 3, 3] },
  { q: 'dim', s: 5, rel: [null, 0, 1, 2, 1, null], fi: [0, 1, 2, 4, 3, 0] },
  { q: 'aug', s: 5, rel: [null, 0, 3, 2, 2, null], fi: [0, 1, 4, 2, 3, 0] },
  { q: '9', s: 5, rel: [null, 0, -1, 0, 0, 0], fi: [0, 2, 1, 3, 3, 3] },
  { q: '5', s: 5, rel: [null, 0, 2, 2, null, null], fi: [0, 1, 3, 4, 0, 0] },
  { q: 'dim7', s: 4, rel: [null, null, 0, 1, 0, 1], fi: [0, 0, 1, 3, 2, 4] }
];
const STRING_PC = { 6: 4, 5: 9, 4: 2 };

function voicingsFor(raw) {
  const p = parseChord(raw);
  if (!p) return { ok: false, reason: 'Ce symbole n’est pas un accord reconnu.' };
  const q = QUALITY_MAP[p.suffix.replace(/\s/g, '')];
  if (!q) return { ok: false, reason: `La qualité « ${p.suffix} » n’est pas encore dans la bibliothèque de positions vérifiées.` };
  const pc = pcOf(p.root);
  const out = [];
  let bassNote = null;
  if (p.bass) {
    const bpc = pcOf(p.bass);
    const sl = SLASH[`${pc}:${q}/${bpc}`];
    if (sl) out.push({ frets: sl[0], fingers: sl[1], label: 'Renversement' });
    bassNote = p.bass;
  }
  const open = OPEN[`${pc}:${q}`];
  if (open) out.push({ frets: open[0], fingers: open[1], label: 'Position ouverte' });
  for (const sh of MOVABLE) {
    if (sh.q !== q) continue;
    const r = (pc - STRING_PC[sh.s] + 12) % 12;
    if (r < 1 || r > 11) continue;
    const frets = sh.rel.map((x) => (x === null ? -1 : r + x));
    if (frets.some((f) => f < -1 || (f === -1 && false))) continue;
    if (frets.some((f) => f > 15)) continue;
    const fingers = sh.fi.map((f, i) => (frets[i] <= 0 ? 0 : f));
    out.push({ frets, fingers, label: `Barré, fondamentale corde ${sh.s}` });
  }
  if (!out.length) return { ok: false, reason: 'Aucune position vérifiée n’est enregistrée pour cet accord.' };
  // Position ouverte d'abord, puis par hauteur sur le manche
  const lowest = (v) => Math.min(...v.frets.filter((f) => f > 0).concat([99]));
  const head = out.filter((v) => v.label !== 'Position ouverte' && v.label !== 'Renversement' ? false : true);
  const rest = out.filter((v) => !head.includes(v)).sort((a, b) => lowest(a) - lowest(b));
  return { ok: true, list: head.concat(rest), bassNote, quality: q };
}

function diagramSVG(v) {
  const fr = v.frets, fi = v.fingers;
  const pressed = fr.filter((f) => f > 0);
  const maxF = pressed.length ? Math.max(...pressed) : 0;
  const minF = pressed.length ? Math.min(...pressed) : 1;
  const base = maxF <= 5 ? 1 : minF;
  const x0 = 46, sp = 28, y0 = 54, fh = 36, nF = 5;
  const W = x0 * 2 + sp * 5, H = y0 + fh * nF + 34;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagramme d’accord">`;
  for (let k = 0; k <= nF; k++) s += `<line class="dg-fret" x1="${x0}" x2="${x0 + sp * 5}" y1="${y0 + k * fh}" y2="${y0 + k * fh}"/>`;
  if (base === 1) s += `<line class="dg-nut" x1="${x0 - 1}" x2="${x0 + sp * 5 + 1}" y1="${y0}" y2="${y0}"/>`;
  else s += `<text class="dg-base" x="${x0 - 12}" y="${y0 + fh / 2 + 5}" text-anchor="end">${base}<tspan font-size="10">e</tspan></text>`;
  for (let i = 0; i < 6; i++) s += `<line class="dg-string" x1="${x0 + i * sp}" x2="${x0 + i * sp}" y1="${y0}" y2="${y0 + fh * nF}"/>`;
  // barrés : même doigt, même case, sur plusieurs cordes
  const drawnBarre = new Set();
  for (let i = 0; i < 6; i++) {
    const f = fr[i], d = fi[i];
    if (f <= 0 || !d) continue;
    const key = d + ':' + f;
    if (drawnBarre.has(key)) continue;
    const idx = [];
    for (let j = 0; j < 6; j++) if (fr[j] === f && fi[j] === d) idx.push(j);
    if (idx.length > 1) {
      drawnBarre.add(key);
      const y = y0 + (f - base + 0.5) * fh;
      const xa = x0 + idx[0] * sp, xb = x0 + idx[idx.length - 1] * sp;
      s += `<rect class="dg-barre" x="${xa - 11}" y="${y - 11}" width="${xb - xa + 22}" height="22" rx="11"/>`;
    }
  }
  for (let i = 0; i < 6; i++) {
    const f = fr[i], x = x0 + i * sp;
    if (f === -1) s += `<path class="dg-mute" d="M${x - 6} ${y0 - 22}l12 12M${x + 6} ${y0 - 22}l-12 12"/>`;
    else if (f === 0) s += `<circle class="dg-open" cx="${x}" cy="${y0 - 16}" r="6.5"/>`;
    else {
      const y = y0 + (f - base + 0.5) * fh;
      const key = fi[i] + ':' + f;
      const inBarre = drawnBarre.has(key);
      const first = inBarre ? fr.findIndex((ff, j) => ff === f && fi[j] === fi[i]) === i : true;
      if (!inBarre) s += `<circle class="dg-dot" cx="${x}" cy="${y}" r="11"/>`;
      if (fi[i] && first) s += `<text class="dg-num" x="${x}" y="${y + 4.5}" text-anchor="middle">${fi[i]}</text>`;
    }
  }
  const names = ['Mi', 'La', 'Ré', 'Sol', 'Si', 'Mi'];
  for (let i = 0; i < 6; i++) s += `<text class="dg-txt" x="${x0 + i * sp}" y="${y0 + fh * nF + 22}" text-anchor="middle">${names[i]}</text>`;
  return s + '</svg>';
}

