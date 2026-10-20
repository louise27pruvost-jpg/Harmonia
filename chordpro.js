/* Harmonia — format ChordPro */
'use strict';
/* ===================================================================
   ChordPro : analyse, rendu, conversion depuis « accords au-dessus »
   =================================================================== */
const SECTION_LABELS = { chorus: 'Refrain', verse: 'Couplet', bridge: 'Pont', intro: 'Introduction', outro: 'Fin', solo: 'Solo', tab: 'Tablature', grid: 'Grille' };

function parseChordPro(text) {
  const meta = {};
  const blocks = [];
  let inTab = false, tabLines = [];
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (inTab) {
      if (/^\{\s*(eot|end_of_tab)\s*\}$/i.test(t)) { blocks.push({ type: 'tab', lines: tabLines }); tabLines = []; inTab = false; }
      else tabLines.push(line.replace(/\s+$/, ''));
      continue;
    }
    const m = t.match(/^\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}$/i);
    if (m) {
      const k = m[1].toLowerCase(), v = (m[2] || '').trim();
      if (k === 'title' || k === 't') meta.title = v;
      else if (k === 'artist' || k === 'subtitle' || k === 'st') meta.artist = meta.artist || v;
      else if (k === 'key') meta.key = v;
      else if (k === 'capo') meta.capo = v;
      else if (k === 'difficulty') meta.difficulty = v;
      else if (k === 'soc' || k === 'start_of_chorus') blocks.push({ type: 'start', kind: 'chorus', label: v || 'Refrain' });
      else if (k === 'sov' || k === 'start_of_verse') blocks.push({ type: 'start', kind: 'verse', label: v || 'Couplet' });
      else if (k === 'sob' || k === 'start_of_bridge') blocks.push({ type: 'start', kind: 'bridge', label: v || 'Pont' });
      else if (k === 'sot' || k === 'start_of_tab') inTab = true;
      else if (k === 'chorus') blocks.push({ type: 'label', text: v || 'Refrain' });
      else if (/^start_of_/.test(k)) { const kind = k.slice(9); blocks.push({ type: 'start', kind, label: v || SECTION_LABELS[kind] || kind }); }
      else if (/^(eoc|eov|eob|end_of_[a-z]+)$/.test(k)) blocks.push({ type: 'end' });
      else if (k === 'c' || k === 'comment' || k === 'ci' || k === 'comment_italic' || k === 'cb' || k === 'comment_box') blocks.push({ type: 'label', text: v });
      else meta[k] = v;
      continue;
    }
    if (t.startsWith('#')) continue;
    if (t === '') { if (blocks.length && blocks[blocks.length - 1].type !== 'blank') blocks.push({ type: 'blank' }); continue; }
    blocks.push({ type: 'line', segs: parseLine(line.replace(/\s+$/, '')) });
  }
  if (inTab && tabLines.length) blocks.push({ type: 'tab', lines: tabLines });
  return { meta, blocks };
}
function parseLine(line) {
  const segs = [];
  const re = /\[([^\]]*)\]/g;
  let last = 0, m, chord = null;
  while ((m = re.exec(line))) {
    const txt = line.slice(last, m.index);
    if (txt || chord !== null) segs.push({ chord, text: txt });
    chord = m[1].trim();
    last = re.lastIndex;
  }
  const tail = line.slice(last);
  if (tail || chord !== null) segs.push({ chord, text: tail });
  return segs;
}
function chordButton(orig, shift, flats) {
  const shown = transposeChord(orig, shift, flats);
  return `<button type="button" class="chord" data-act="chord" data-chord="${esc(shown)}">${esc(shown)}</button>`;
}
function renderLine(segs, shift, flats, interactive) {
  const hasChord = segs.some((s) => s.chord);
  if (!hasChord) return `<p class="ln lyr">${esc(segs.map((s) => s.text).join('')) || '&nbsp;'}</p>`;
  const hasText = segs.some((s) => s.text.trim());
  const words = [];
  let cur = [];
  const flush = () => { if (cur.length) { words.push(cur); cur = []; } };
  for (const s of segs) {
    const parts = s.text.split(/(\s+)/);
    let used = s.chord === null || s.chord === '';
    if (!used && parts[0] === '') { cur.push({ chord: s.chord, text: '' }); used = true; }
    for (const p of parts) {
      if (p === '') continue;
      if (/^\s+$/.test(p)) { flush(); continue; }
      cur.push({ chord: used ? null : s.chord, text: p });
      used = true;
    }
  }
  flush();
  const unit = (u) => {
    const c = u.chord ? (interactive ? chordButton(u.chord, shift, flats) : esc(transposeChord(u.chord, shift, flats))) : '';
    return `<span class="u"><span class="c">${c}</span><span class="l">${u.text ? esc(u.text) : ' '}</span></span>`;
  };
  return `<div class="ln${hasText ? '' : ' cho'}">${words.map((w) => `<span class="w">${w.map(unit).join('')}</span>`).join('')}</div>`;
}
const TAB_TECH = [
  [/\d?h\d/, 'h', 'hammer-on'], [/\dp\d/, 'p', 'pull-off'], [/\db/, 'b', 'tiré (bend)'], [/\dr\d/, 'r', 'relâché'],
  [/\d\/\d/, '/', 'glissé montant'], [/\d\\\d/, '\\', 'glissé descendant'], [/~/, '~', 'vibrato'], [/[|-]x/i, 'x', 'note étouffée'], [/PM/, 'PM', 'étouffé paume (palm mute)']
];
function renderTab(lines, inst = 'guitare') {
  if (inst !== 'guitare' && typeof convertTab === 'function') return renderAdaptedTab(lines, inst);
  const txt = lines.join('\n');
  const used = TAB_TECH.filter(([re]) => re.test(txt));
  const legend = used.length ? `<p class="tab-legend">${used.map(([, k, l]) => `<span><b>${esc(k)}</b> ${l}</span>`).join('')}</p>` : '';
  return `<figure class="tab" style="margin-inline:0"><div class="tab-scroll" tabindex="0" aria-label="Tablature"><pre>${esc(txt)}</pre></div>${legend}</figure>`;
}
function renderSongBody(body, shift, flats, interactive = true, inst = 'guitare') {
  const { blocks } = parseChordPro(body);
  let html = '', open = false;
  for (const b of blocks) {
    if (b.type === 'start') { if (open) html += '</section>'; html += `<section class="sec sec-${esc(b.kind)}"><h3 class="sec-label">${esc(b.label)}</h3>`; open = true; }
    else if (b.type === 'end') { if (open) { html += '</section>'; open = false; } }
    else if (b.type === 'label') html += `<h3 class="sec-label">${esc(b.text)}</h3>`;
    else if (b.type === 'blank') html += '<div class="gap" aria-hidden="true"></div>';
    else if (b.type === 'tab') html += renderTab(b.lines, inst);
    else if (b.type === 'line') html += renderLine(b.segs, shift, flats, interactive);
  }
  if (open) html += '</section>';
  return html;
}
function bodyInfo(body, tab) {
  const { blocks } = parseChordPro(body);
  let chords = false, lyrics = false, tabs = !!(tab && tab.trim());
  const list = [];
  for (const b of blocks) {
    if (b.type === 'tab') tabs = true;
    if (b.type === 'line') for (const s of b.segs) {
      if (s.chord) { chords = true; if (!list.includes(s.chord)) list.push(s.chord); }
      if (s.text.trim()) lyrics = true;
    }
  }
  return { chords, lyrics, tabs, list };
}

/* --- Conversion « accords au-dessus des paroles » → ChordPro --- */
const CHORD_TOKEN = /^\(?[A-G](?:#|b)?(?:maj|min|dim|aug|sus|add|m|M|°|ø|Δ|\+|-|\d|\(|\)|#|b)*(?:\/[A-G](?:#|b)?)?\)?$/;
function isChordToken(t) { return CHORD_TOKEN.test(t) || /^(N\.?C\.?|\||%|x\d)$/i.test(t); }
function isChordLine(line) {
  if (/[[\]{}]/.test(line)) return false;
  const toks = line.trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return false;
  return toks.every(isChordToken) && toks.some((t) => CHORD_TOKEN.test(t));
}
const SECTION_RE = /^\s*[[(]?\s*(intro(?:duction)?|outro|fin|coda|couplet|refrain|pont|bridge|chorus|verse|pr[ée]-?refrain|pre-?chorus|post-?chorus|solo|instrumental|interlude|break|hook|riff)\b([^\])]{0,20})[\])]?\s*:?\s*$/i;
const TAB_LINE = /^\s*[A-Ga-g][#b]?\s*\|.*-.*$/;
function mergeChordLyric(cl, ll) {
  const chords = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(cl))) chords.push({ pos: m.index, c: m[0] });
  let li = ll;
  const maxPos = chords.length ? chords[chords.length - 1].pos : 0;
  if (li.length < maxPos) li = li.padEnd(maxPos, ' ');
  for (let k = chords.length - 1; k >= 0; k--) li = li.slice(0, chords[k].pos) + `[${chords[k].c}]` + li.slice(chords[k].pos);
  return li.replace(/\s+$/, '');
}
function plainToChordPro(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const out = [];
  let i = 0, inTab = false;
  while (i < lines.length) {
    const line = lines[i];
    if (TAB_LINE.test(line)) {
      if (!inTab) { out.push('{start_of_tab}'); inTab = true; }
      out.push(line.replace(/\s+$/, '')); i++; continue;
    }
    if (inTab) { out.push('{end_of_tab}'); inTab = false; }
    const sm = line.match(SECTION_RE);
    if (sm) { out.push(`{comment: ${sectionLabel(line)}}`); i++; continue; }
    if (isChordLine(line)) {
      const next = lines[i + 1];
      if (next !== undefined && next.trim() && !isChordLine(next) && !SECTION_RE.test(next) && !TAB_LINE.test(next) && !/^\s*\{/.test(next)) {
        out.push(mergeChordLyric(line, next)); i += 2; continue;
      }
      out.push(line.trim().split(/\s+/).map((c) => (CHORD_TOKEN.test(c) ? `[${c}]` : c)).join('  '));
      i++; continue;
    }
    out.push(line.replace(/\s+$/, ''));
    i++;
  }
  if (inTab) out.push('{end_of_tab}');
  return out.join('\n');
}
function looksLikeChordPro(text) {
  if (/^\s*\{\s*(title|t|artist|start_of_\w+|soc|sov|sob|sot|eoc|key|capo)\s*(:.*)?\}\s*$/im.test(text)) return true;
  const inl = String(text).match(/\[([^\]\s]{1,12})\]/g) || [];
  return inl.filter((x) => CHORD_TOKEN.test(x.slice(1, -1))).length >= 2;
}
function songToChordPro(song) {
  const head = [`{title: ${song.title}}`];
  if (song.artist) head.push(`{artist: ${song.artist}}`);
  if (song.key) head.push(`{key: ${song.key}}`);
  if (song.capo) head.push(`{capo: ${song.capo}}`);
  if (song.difficulty) head.push(`{difficulty: ${song.difficulty}}`);
  if (song.structure) head.push(`{structure: ${song.structure}}`);
  let s = head.join('\n') + '\n\n' + (song.body || '').trim() + '\n';
  if (song.tab && song.tab.trim()) s += '\n{start_of_tab}\n' + song.tab.replace(/\s+$/, '') + '\n{end_of_tab}\n';
  if (song.notes && song.notes.trim()) s += '\n' + song.notes.trim().split('\n').map((l) => '# ' + l).join('\n') + '\n';
  return s;
}
/** Sépare les métadonnées ChordPro du corps. */
function chordProToSong(text, fallbackTitle) {
  const src = String(text || '').replace(/\r\n?/g, '\n');
  const metaKeys = /^\{\s*(title|t|artist|subtitle|st|key|capo|difficulty|structure)\s*:\s*(.*?)\s*\}\s*$/i;
  const meta = {};
  const bodyLines = [];
  for (const line of src.split('\n')) {
    const m = line.trim().match(metaKeys);
    if (m) {
      const k = m[1].toLowerCase();
      const key = k === 't' ? 'title' : (k === 'subtitle' || k === 'st') ? 'artist' : k;
      if (!meta[key]) meta[key] = m[2];
    } else bodyLines.push(line);
  }
  const body = bodyLines.join('\n').replace(/^\n+/, '').replace(/\s+$/, '');
  return { title: meta.title || fallbackTitle || 'Sans titre', artist: meta.artist || '', key: meta.key || '', capo: meta.capo || '', difficulty: meta.difficulty || '', structure: meta.structure || '', body };
}

