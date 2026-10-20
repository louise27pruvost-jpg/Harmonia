/* Harmonia — instruments : guitare, ukulélé, mandoline, basse, piano.
   - Diagrammes : bibliothèque vérifiée pour la guitare ; pour les autres instruments à cordes,
     positions calculées à partir des notes de l'accord puis contrôlées (notes justes, doigté jouable).
   - Piano : clavier avec les notes de l'accord.
   - Tablatures : conversion d'une tablature de guitare vers un autre instrument (mêmes hauteurs
     de notes, à l'octave près quand la note sort de la tessiture). */
'use strict';

const INSTRUMENTS = {
  guitare: { name: 'Guitare', strings: [40, 45, 50, 55, 59, 64], mute: true, rootBass: true, minNotes: 3, maxFret: 15, defaultTuning: 'standard' },
  ukulele: { name: 'Ukulélé', strings: [67, 60, 64, 69], mute: false, rootBass: false, minNotes: 4, maxFret: 12, defaultTuning: 'uke_std' },
  mandoline: { name: 'Mandoline', strings: [55, 62, 69, 76], mute: false, rootBass: false, minNotes: 4, maxFret: 12, defaultTuning: 'mando' },
  basse: { name: 'Basse', strings: [28, 33, 38, 43], mute: true, rootBass: true, minNotes: 2, maxFret: 15, arpeggio: true, defaultTuning: 'bass4' },
  piano: { name: 'Piano', keyboard: true, defaultTuning: 'chromatic' }
};
const instKey = () => (INSTRUMENTS[S().instrument] ? S().instrument : 'guitare');
const curInst = () => INSTRUMENTS[instKey()];
/** Cordes réellement utilisées : celles de l'accordage choisi si elles correspondent à l'instrument. */
function instStrings(key = instKey()) {
  const inst = INSTRUMENTS[key];
  const t = typeof TUNINGS !== 'undefined' ? TUNINGS[S().tuning] : null;
  if (t && t.inst === key && t.strings.length && key !== 'guitare') return t.strings;
  return inst.strings;
}
const frName = (pc) => { const n = SHARPS[(pc % 12 + 12) % 12]; return FR_NOTES[n[0]] + (n[1] === '#' ? '♯' : ''); };

/* Intervalles des qualités reconnues ; « req » = notes indispensables (la quinte juste est facultative). */
const CHORD_TONES = {
  maj: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus2: [0, 2, 7], sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10], dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8], add9: [0, 2, 4, 7], '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9], '9': [0, 2, 4, 7, 10], '5': [0, 7]
};
function chordPcs(raw) {
  const p = parseChord(raw);
  if (!p) return null;
  const q = QUALITY_MAP[p.suffix.replace(/\s/g, '')];
  if (!q) return { root: pcOf(p.root), q: null, p };
  const root = pcOf(p.root);
  const tones = CHORD_TONES[q].map((t) => (root + t) % 12);
  const req = CHORD_TONES[q].filter((t) => t !== 7 || q === '5').map((t) => (root + t) % 12);
  return { root, q, tones, req, bass: p.bass ? pcOf(p.bass) : null, p };
}

/* ---------- Doigté : un doigt par case, barré de l'index si nécessaire ; null si injouable ---------- */
function assignFingers(frets) {
  const pos = frets.map((f, i) => ({ i, f })).filter((x) => x.f > 0);
  const fing = frets.map(() => 0);
  if (!pos.length) return fing;
  const minF = Math.min(...pos.map((x) => x.f));
  const nearNut = minF <= 3 && frets.some((f) => f === 0);
  const byFret = [...new Set(pos.map((x) => x.f))].sort((a, b) => a - b);
  let next = 1;
  for (const f of byFret) {
    const ps = pos.filter((x) => x.f === f).sort((a, b) => a.i - b.i);
    let start = Math.max(next, nearNut ? f : f - minF + 1);
    if (ps.length > 1 && f === minF) {
      const lo = ps[0].i, hi = ps[ps.length - 1].i;
      if (frets.slice(lo, hi + 1).every((x) => x >= f)) { if (start > 4) return null; ps.forEach((x) => { fing[x.i] = start; }); next = start + 1; continue; }
    }
    for (const x of ps) { if (start > 4) return null; fing[x.i] = start++; }
    next = start;
  }
  return fing;
}

/* ---------- Recherche des positions pour un instrument à cordes ---------- */
const genCache = new Map();
function generateVoicings(raw, key) {
  const ck = key + ':' + raw + ':' + instStrings(key).join(',');
  if (genCache.has(ck)) return genCache.get(ck);
  const inst = INSTRUMENTS[key];
  const strings = instStrings(key);
  const c = chordPcs(raw);
  let res;
  if (!c) res = { ok: false, reason: 'Ce symbole n’est pas un accord reconnu.' };
  else if (!c.q) res = { ok: false, reason: `La qualité « ${c.p.suffix} » n’est pas encore prise en charge pour cet instrument.` };
  else {
    const allowed = new Set(c.tones); if (c.bass !== null) allowed.add(c.bass);
    const lowest = c.bass !== null ? c.bass : c.root;
    const n = strings.length;
    const found = new Map();
    for (let base = 0; base <= 9; base++) {
      const choices = [];
      for (let s = 0; s < n; s++) {
        const opts = inst.mute ? [-1, 0] : [0];
        for (let f = Math.max(1, base); f <= base + 3; f++) if (f <= inst.maxFret) opts.push(f);
        choices.push(opts.filter((f) => f === -1 || allowed.has((strings[s] + Math.max(f, 0)) % 12) || f === -1));
      }
      const cur = new Array(n);
      const walk = (s) => {
        if (s === n) { consider(cur.slice()); return; }
        for (const f of choices[s]) { cur[s] = f; walk(s + 1); }
      };
      const consider = (fr) => {
        const sounded = fr.map((f, i) => (f < 0 ? null : strings[i] + f));
        const notes = sounded.filter((x) => x !== null);
        if (notes.length < inst.minNotes) return;
        if (inst.arpeggio && notes.length > 4) return;
        // accord plaqué : cordes étouffées seulement du côté grave ; arpège (basse) : notes jouées une à une
        const firstPlayed = fr.findIndex((f) => f >= 0);
        if (!inst.arpeggio && fr.slice(firstPlayed).some((f) => f < 0)) return;
        const pcs = new Set(notes.map((x) => x % 12));
        if (!c.req.every((t) => pcs.has(t))) return;
        if (c.bass !== null && !pcs.has(c.bass)) return;
        // basse et guitare : fondamentale (ou basse indiquée) au grave ; ukulélé et mandoline : seulement pour un accord à basse imposée
        if ((inst.rootBass || c.bass !== null) && Math.min(...notes) % 12 !== lowest) return;
        const fretted = fr.filter((f) => f > 0);
        if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) return;
        const fingers = assignFingers(fr);
        if (!fingers) return;
        const mutes = fr.filter((f) => f < 0).length;
        const cost = fretted.reduce((a, f) => a + f, 0) * 0.6 + (fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0) * 1.5 + mutes * (inst.arpeggio ? 0.2 : 1.2) + new Set(fingers.filter((d) => d)).size * 0.5 + (fretted.length ? Math.min(...fretted) : 0) * 0.8 + (Math.min(...notes) % 12 === lowest ? 0 : 0.4);
        const k = fr.join(',');
        if (!found.has(k)) found.set(k, { frets: fr, fingers, cost });
      };
      walk(0);
    }
    const list = [...found.values()].sort((a, b) => a.cost - b.cost);
    const picked = [];
    for (const v of list) {
      const pos = Math.min(...v.frets.filter((f) => f > 0).concat([0]));
      if (picked.some((p) => Math.abs(Math.min(...p.frets.filter((f) => f > 0).concat([0])) - pos) < 2)) continue;
      picked.push(v);
      if (picked.length === 4) break;
    }
    res = picked.length
      ? { ok: true, list: picked.map((v, i) => ({ ...v, label: inst.arpeggio ? 'Notes de l’accord (à jouer en arpège)' : i === 0 ? 'Position principale' : 'Autre position' })), bassNote: null, quality: c.q, computed: true }
      : { ok: false, reason: `Aucune position jouable n’a été trouvée pour cet accord au ${inst.name.toLowerCase()}.` };
  }
  genCache.set(ck, res);
  return res;
}
/** Positions pour l'instrument choisi (guitare : bibliothèque vérifiée). */
function chordShapes(raw, key = instKey()) {
  if (key === 'piano') { const c = chordPcs(raw); return c && c.q ? { ok: true, piano: true, chord: c } : { ok: false, reason: c ? `La qualité « ${c.p.suffix} » n’est pas encore prise en charge.` : 'Ce symbole n’est pas un accord reconnu.' }; }
  if (key === 'guitare') return voicingsFor(raw);
  return generateVoicings(raw, key);
}

/* ---------- Diagramme d'instrument à cordes (n cordes) ---------- */
function fretDiagramSVG(v, strings) {
  const n = strings.length, fr = v.frets, fi = v.fingers;
  const pressed = fr.filter((f) => f > 0);
  const maxF = pressed.length ? Math.max(...pressed) : 0, minF = pressed.length ? Math.min(...pressed) : 1;
  const base = maxF <= 5 ? 1 : minF;
  const sp = n <= 4 ? 34 : 28, x0 = 46, y0 = 54, fh = 36, nF = 5;
  const W = x0 * 2 + sp * (n - 1), H = y0 + fh * nF + 34;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagramme d’accord">`;
  for (let k = 0; k <= nF; k++) s += `<line class="dg-fret" x1="${x0}" x2="${x0 + sp * (n - 1)}" y1="${y0 + k * fh}" y2="${y0 + k * fh}"/>`;
  if (base === 1) s += `<line class="dg-nut" x1="${x0 - 1}" x2="${x0 + sp * (n - 1) + 1}" y1="${y0}" y2="${y0}"/>`;
  else s += `<text class="dg-base" x="${x0 - 12}" y="${y0 + fh / 2 + 5}" text-anchor="end">${base}<tspan font-size="10">e</tspan></text>`;
  for (let i = 0; i < n; i++) s += `<line class="dg-string" x1="${x0 + i * sp}" x2="${x0 + i * sp}" y1="${y0}" y2="${y0 + fh * nF}"/>`;
  const drawn = new Set();
  for (let i = 0; i < n; i++) {
    const f = fr[i], d = fi[i];
    if (f <= 0 || !d || drawn.has(d + ':' + f)) continue;
    const idx = []; for (let j = 0; j < n; j++) if (fr[j] === f && fi[j] === d) idx.push(j);
    if (idx.length > 1) {
      drawn.add(d + ':' + f);
      const y = y0 + (f - base + 0.5) * fh, xa = x0 + idx[0] * sp, xb = x0 + idx[idx.length - 1] * sp;
      s += `<rect class="dg-barre" x="${xa - 11}" y="${y - 11}" width="${xb - xa + 22}" height="22" rx="11"/>`;
    }
  }
  for (let i = 0; i < n; i++) {
    const f = fr[i], x = x0 + i * sp;
    if (f === -1) s += `<path class="dg-mute" d="M${x - 6} ${y0 - 22}l12 12M${x + 6} ${y0 - 22}l-12 12"/>`;
    else if (f === 0) s += `<circle class="dg-open" cx="${x}" cy="${y0 - 16}" r="6.5"/>`;
    else {
      const y = y0 + (f - base + 0.5) * fh, inB = drawn.has(fi[i] + ':' + f);
      const first = inB ? fr.findIndex((ff, j) => ff === f && fi[j] === fi[i]) === i : true;
      if (!inB) s += `<circle class="dg-dot" cx="${x}" cy="${y}" r="11"/>`;
      if (fi[i] && first) s += `<text class="dg-num" x="${x}" y="${y + 4.5}" text-anchor="middle">${fi[i]}</text>`;
    }
  }
  for (let i = 0; i < n; i++) s += `<text class="dg-txt" x="${x0 + i * sp}" y="${y0 + fh * nF + 22}" text-anchor="middle">${frName(strings[i] % 12)}</text>`;
  return s + '</svg>';
}

/* ---------- Clavier de piano ---------- */
function pianoVoicing(c) {
  const root = 48 + c.root; // octave de Do 3
  const notes = CHORD_TONES[c.q].map((t) => root + t);
  const bass = c.bass !== null ? 36 + c.bass : null;
  return { notes, bass };
}
function pianoSVG(c) {
  const { notes, bass } = pianoVoicing(c);
  const all = bass !== null ? [bass, ...notes] : notes;
  const start = Math.floor(Math.min(...all) / 12) * 12, end = Math.max(...all) + 1;
  const whites = [];
  for (let m = start; m <= Math.max(end, start + 23); m++) if ([0, 2, 4, 5, 7, 9, 11].includes(m % 12)) whites.push(m);
  const ww = 26, W = whites.length * ww + 2, H = 132;
  let s = `<svg viewBox="0 0 ${W} ${H + 26}" role="img" aria-label="Clavier : notes de l’accord">`;
  const on = (m) => all.includes(m);
  whites.forEach((m, i) => {
    s += `<rect x="${1 + i * ww}" y="1" width="${ww}" height="${H}" rx="4" class="pk-white${on(m) ? ' on' : ''}"/>`;
    if (on(m)) s += `<circle cx="${1 + i * ww + ww / 2}" cy="${H - 18}" r="9" class="pk-dot${m === bass ? ' bass' : ''}"/>`;
    if (m % 12 === 0) s += `<text x="${1 + i * ww + ww / 2}" y="${H + 18}" text-anchor="middle" class="dg-txt">Do${Math.floor(m / 12) - 1}</text>`;
  });
  whites.forEach((m, i) => {
    const b = m + 1;
    if ([1, 3, 6, 8, 10].includes(b % 12) && i < whites.length - 1) {
      const x = 1 + (i + 1) * ww - 8;
      s += `<rect x="${x}" y="1" width="16" height="${H * 0.62}" rx="3" class="pk-black${on(b) ? ' on' : ''}"/>`;
      if (on(b)) s += `<circle cx="${x + 8}" cy="${H * 0.62 - 14}" r="6.5" class="pk-dot light${b === bass ? ' bass' : ''}"/>`;
    }
  });
  return s + '</svg>';
}
function pianoFingering(c) {
  const k = CHORD_TONES[c.q].length;
  return k <= 2 ? '1 – 5' : k === 3 ? '1 – 3 – 5' : k === 4 ? '1 – 2 – 3 – 5' : '1 – 2 – 3 – 4 – 5';
}

/* ---------- Tablatures : lecture et conversion ---------- */
const GUITAR_STD = [64, 59, 55, 50, 45, 40]; // de la corde du haut (Mi aigu) à celle du bas
/** Lit un bloc de tablature de guitare : renvoie les évènements (colonne, notes jouées). */
function parseTabBlock(lines) {
  const rows = lines.map((l) => { const m = l.match(/^\s*([A-Ga-g][#b]?)?\s*\|(.*)$/); return m ? m[2] : null; });
  const idx = rows.map((r, i) => (r !== null ? i : -1)).filter((i) => i >= 0);
  if (idx.length !== 6) return null;
  const strRows = idx.map((i) => rows[i]);
  const width = Math.max(...strRows.map((r) => r.length));
  const events = [], bars = [];
  for (let col = 0; col < width; col++) {
    const notes = [];
    strRows.forEach((r, s) => {
      const ch = r[col];
      if (ch && /\d/.test(ch) && !/\d/.test(r[col - 1] || '')) {
        let j = col; while (/\d/.test(r[j] || '')) j++;
        notes.push({ s, fret: Number(r.slice(col, j)), midi: GUITAR_STD[s] + Number(r.slice(col, j)) });
      }
    });
    if (notes.length) events.push({ col, notes });
    if (strRows[0][col] === '|' && col > 0) bars.push(col);
  }
  const techniques = /[hpbr\/\\~]/i.test(strRows.join('').replace(/\d|-|\|/g, ''));
  return { events, bars, width, techniques };
}
/** Convertit une tablature de guitare vers l'instrument choisi. */
function convertTab(lines, key) {
  const parsed = parseTabBlock(lines);
  if (!parsed) return { ok: false, reason: 'Cette tablature n’a pas 6 cordes : elle est affichée telle quelle.' };
  const inst = INSTRUMENTS[key];
  if (inst.keyboard) {
    const out = []; let bar = [];
    let bi = 0;
    for (const ev of parsed.events) {
      while (bi < parsed.bars.length && parsed.bars[bi] < ev.col) { if (bar.length) out.push(bar.join(' ')); bar = []; bi++; }
      bar.push(ev.notes.map((n) => frName(n.midi % 12) + (Math.floor(n.midi / 12) - 1)).join('+'));
    }
    if (bar.length) out.push(bar.join(' '));
    return { ok: true, piano: true, text: out.join('  |  '), techniques: parsed.techniques, shifted: 0 };
  }
  const strings = instStrings(key).slice().reverse(); // ordre d'écriture : corde du haut (la plus aiguë physiquement) en premier
  let shifted = 0, prev = 3;
  const placed = parsed.events.map((ev) => {
    const used = new Set();
    return { col: ev.col, notes: ev.notes.sort((a, b) => b.midi - a.midi).map((nt) => {
      for (const oct of [0, 12, -12, 24, -24]) {
        const m = nt.midi + oct;
        const cands = strings.map((sm, si) => ({ si, fret: m - sm })).filter((x) => x.fret >= 0 && x.fret <= inst.maxFret && !used.has(x.si));
        if (cands.length) {
          cands.sort((a, b) => Math.abs(a.fret - prev) + a.fret * 0.15 - (Math.abs(b.fret - prev) + b.fret * 0.15));
          const best = cands[0]; used.add(best.si); prev = best.fret; if (oct) shifted++;
          return best;
        }
      }
      return null;
    }).filter(Boolean) };
  });
  const rowsOut = strings.map(() => []);
  const width = parsed.width + 2;
  strings.forEach((_, si) => { rowsOut[si] = new Array(width).fill('-'); parsed.bars.forEach((b) => { rowsOut[si][b] = '|'; }); });
  for (const ev of placed) for (const nt of ev.notes) {
    const t = String(nt.fret);
    for (let k = 0; k < t.length; k++) rowsOut[nt.si][ev.col + k] = t[k];
  }
  const text = strings.map((sm, si) => SHARPS[sm % 12] + '|' + rowsOut[si].join('').replace(/-+$/, '')).join('\n');
  return { ok: true, text, techniques: parsed.techniques, shifted };
}

/** Tablature affichée pour un autre instrument que la guitare : version convertie + original repliable. */
function renderAdaptedTab(lines, key) {
  const inst = INSTRUMENTS[key];
  const orig = renderTab(lines, 'guitare');
  // une tablature peut contenir plusieurs systèmes de 6 lignes séparés par des lignes vides
  const groups = []; let cur = [];
  for (const l of lines) { if (l.trim()) cur.push(l); else if (cur.length) { groups.push(cur); cur = []; } }
  if (cur.length) groups.push(cur);
  const parts = groups.map((g) => convertTab(g, key));
  if (!parts.length || parts.some((p) => !p.ok)) return `<div class="notice">${icon('info')}<p>${esc((parts.find((p) => !p.ok) || {}).reason || 'Tablature illisible.')}</p></div>` + orig;
  const r = { ok: true, piano: parts[0].piano, text: parts.map((p) => p.text).join(parts[0].piano ? '\n' : '\n\n'), techniques: parts.some((p) => p.techniques), shifted: parts.reduce((a, p) => a + p.shifted, 0) };
  const notes = [];
  if (r.shifted) notes.push(`${r.shifted} note${r.shifted > 1 ? 's' : ''} déplacée${r.shifted > 1 ? 's' : ''} d’une octave pour tenir sur l’instrument`);
  if (r.techniques) notes.push('techniques de jeu (liés, glissés, tirés) non reportées');
  const head = r.piano
    ? `<p class="tab-cap">Notes de la mélodie pour le piano, converties depuis la tablature de guitare (son réel).</p>`
    : `<p class="tab-cap">Tablature adaptée : ${esc(inst.name.toLowerCase())} (${esc(instStrings(key).map((m) => SHARPS[m % 12]).join(' '))}), convertie depuis la guitare.</p>`;
  return `<figure class="tab" style="margin-inline:0">${head}<div class="tab-scroll" tabindex="0" aria-label="Tablature adaptée"><pre>${esc(r.text)}</pre></div>
    ${notes.length ? `<p class="tab-legend">${esc(notes.join(' · '))}.</p>` : ''}
    <details class="tab-orig"><summary>Tablature originale (guitare)</summary>${orig}</details></figure>`;
}

/* ---------- Choix de l'instrument ---------- */
function instrumentOptions() {
  return Object.entries(INSTRUMENTS).map(([k, v]) => `<option value="${k}" ${k === instKey() ? 'selected' : ''}>${v.name}</option>`).join('');
}
function instrumentPicker(id, withLabel = true) {
  return `<label class="tool-group inst-pick" for="${id}">${withLabel ? '<span class="tg-label keep">Instrument</span>' : ''}<select id="${id}" class="inst-select" data-inst="1" aria-label="Instrument">${instrumentOptions()}</select></label>`;
}
function setInstrument(key) {
  if (!INSTRUMENTS[key]) return;
  S().instrument = key;
  const t = TUNINGS[S().tuning];
  if (!t || t.inst !== key) S().tuning = INSTRUMENTS[key].defaultTuning;
  tn.target = 'auto';
  save();
  if (cp.open) { const name = cp.name; cp.idx = 0; renderChordPanel(); highlightChord(name); }
  if (ui.view === 'song') rerenderSongHead();
  else if (ui.view === 'tuner') { const was = tn.mode, keep = tn.analyser; if (keep) { tunerStop(true); } render(); if (keep && was === 'mic') tunerStart(); }
  else { const y = window.scrollY; render(); window.scrollTo(0, y); }
  toast(`Instrument : ${INSTRUMENTS[key].name}`);
}
