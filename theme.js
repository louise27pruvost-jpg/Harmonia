/* Harmonia — couleurs personnalisées : palettes prêtes, sélecteurs, contrôle du contraste (WCAG). */
'use strict';

const COLOR_PRESETS = {
  prune: { name: 'Prune (d’origine)', accent: '#80617D', bg: '#FFF9F6', surface: '#FFFEFC', chord: '#80617D', text: '#37333A' },
  sauge: { name: 'Sauge', accent: '#4D7559', bg: '#F6FAF5', surface: '#FFFFFD', chord: '#4D7559', text: '#2E3530' },
  lavande: { name: 'Lavande', accent: '#6A5BA3', bg: '#F8F6FD', surface: '#FFFFFF', chord: '#6A5BA3', text: '#34313F' },
  rose: { name: 'Rose ancien', accent: '#9E4E6C', bg: '#FFF7F8', surface: '#FFFDFD', chord: '#9E4E6C', text: '#3A3033' },
  bleu: { name: 'Bleu brume', accent: '#3C6A8F', bg: '#F5F9FC', surface: '#FFFFFF', chord: '#3C6A8F', text: '#2D3440' },
  peche: { name: 'Pêche et terre', accent: '#9C5733', bg: '#FFF8F3', surface: '#FFFDFB', chord: '#9C5733', text: '#3A312C' },
  contraste: { name: 'Contraste élevé', accent: '#46264A', bg: '#FFFFFF', surface: '#FFFFFF', chord: '#5A2154', text: '#111111' }
};
const COLOR_FIELDS = [
  ['accent', 'Accent', 'Boutons principaux, liens, cœur des favoris'],
  ['chord', 'Accords', 'Couleur des accords au-dessus des paroles'],
  ['text', 'Texte', 'Paroles et titres'],
  ['bg', 'Fond', 'Arrière-plan des pages'],
  ['surface', 'Cartes et barres', 'Cartes de chansons, barres de commandes, panneaux']
];
const HEX = /^#[0-9a-f]{6}$/i;

/* ---------- Calculs de couleur ---------- */
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
/** Mélange : t = 0 → a, t = 1 → b */
const mixHex = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x.map((v, i) => v + (y[i] - v) * t)); };
function luminance(h) {
  return hexToRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrastRatio(a, b) { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
/** Texte lisible posé sur une couleur : blanc ou presque noir, celui qui contraste le plus. */
const inkOn = (h) => (contrastRatio(h, '#FFFFFF') >= contrastRatio(h, '#1E1A20') ? '#FFFFFF' : '#1E1A20');

function currentColors() {
  const c = S().colors || {};
  const base = COLOR_PRESETS[c.preset] || COLOR_PRESETS.prune;
  if (c.preset !== 'custom') return { ...base };
  const out = { ...COLOR_PRESETS.prune };
  COLOR_FIELDS.forEach(([k]) => { if (HEX.test(c[k] || '')) out[k] = c[k].toUpperCase(); });
  return out;
}
function cleanColors(c) {
  const o = { preset: 'prune' };
  if (!c || typeof c !== 'object') return o;
  if (COLOR_PRESETS[c.preset] || c.preset === 'custom') o.preset = c.preset;
  COLOR_FIELDS.forEach(([k]) => { if (HEX.test(c[k] || '')) o[k] = c[k].toUpperCase(); });
  if (HEX.test(c.base || '')) o.base = c.base.toUpperCase();
  return o;
}
/** Une seule couleur choisie → palette complète et lisible :
    accent assombri jusqu'au contraste 4,5 : 1, fond et cartes teintés très clairs, texte presque noir teinté. */
function paletteFromColor(hex) {
  const base = HEX.test(hex || '') ? hex.toUpperCase() : COLOR_PRESETS.prune.accent;
  const bg = mixHex(base, '#FFFFFF', 0.95), surface = mixHex(base, '#FFFFFF', 0.985);
  let accent = base, steps = 0;
  while (steps < 20 && (contrastRatio(accent, bg) < 4.5 || contrastRatio(inkOn(accent), accent) < 4.5)) { accent = mixHex(accent, '#000000', 0.08); steps++; }
  const text = mixHex(base, '#1E1A20', 0.86);
  return { accent, chord: accent, text, bg, surface, base, adjusted: accent !== base };
}
/** Contrôles de lisibilité (seuils WCAG : 4,5 pour le texte courant, 3 pour les grands textes et éléments graphiques). */
function colorReport(c = currentColors()) {
  return [
    { label: 'Texte sur le fond', ratio: contrastRatio(c.text, c.bg), min: 4.5 },
    { label: 'Texte sur les cartes', ratio: contrastRatio(c.text, c.surface), min: 4.5 },
    { label: 'Accords sur le fond', ratio: contrastRatio(c.chord, c.bg), min: 4.5 },
    { label: 'Accent sur le fond (liens, icônes)', ratio: contrastRatio(c.accent, c.bg), min: 3 },
    { label: 'Texte des boutons principaux', ratio: contrastRatio(inkOn(c.accent), c.accent), min: 4.5 }
  ].map((r) => ({ ...r, ok: r.ratio >= r.min }));
}
/** Jetons de couleur dérivés (thème clair) à partir des cinq couleurs choisies. */
function derivedTokens(c) {
  const muted = mixHex(c.text, c.bg, 0.42);
  return {
    '--bg': c.bg, '--surface': c.surface, '--text': c.text, '--chord': c.chord,
    '--accent': c.accent, '--accent-hover': mixHex(c.accent, '#000000', 0.14), '--accent-ink': inkOn(c.accent),
    '--accent-soft': mixHex(c.accent, c.bg, 0.9), '--muted': contrastRatio(muted, c.bg) >= 4.5 ? muted : mixHex(c.text, c.bg, 0.3),
    '--border': mixHex(c.text, c.bg, 0.89), '--border-strong': mixHex(c.text, c.bg, 0.8),
    '--lav': mixHex(c.accent, c.bg, 0.84), '--rose': mixHex(mixHex(c.accent, '#F2DCE3', 0.5), c.bg, 0.55)
  };
}
/** Thème sombre : on garde le fond sombre, on adapte l'accent et la couleur des accords pour qu'ils restent lisibles. */
function derivedDarkTokens(c) {
  const darkBg = '#1E1A20';
  let accent = mixHex(c.accent, '#FFFFFF', 0.5), chord = mixHex(c.chord, '#FFFFFF', 0.58);
  for (let i = 0; i < 5 && contrastRatio(chord, darkBg) < 4.5; i++) chord = mixHex(chord, '#FFFFFF', 0.25);
  for (let i = 0; i < 5 && contrastRatio(accent, darkBg) < 3; i++) accent = mixHex(accent, '#FFFFFF', 0.25);
  return { '--accent': accent, '--accent-hover': mixHex(accent, '#FFFFFF', 0.2), '--accent-ink': inkOn(accent), '--accent-soft': mixHex(c.accent, darkBg, 0.78), '--chord': chord, '--lav': mixHex(c.accent, darkBg, 0.72) };
}
function applyCustomColors() {
  let el = document.getElementById('custom-colors');
  const c = S().colors || {};
  if (!c.preset || c.preset === 'prune') { if (el) el.textContent = ''; setThemeColorMeta(COLOR_PRESETS.prune.accent); return; }
  const cols = currentColors();
  const css = (sel, tok) => `${sel}{${Object.entries(tok).map(([k, v]) => `${k}:${v}`).join(';')}}`;
  const light = derivedTokens(cols), dark = derivedDarkTokens(cols);
  if (!el) { el = document.createElement('style'); el.id = 'custom-colors'; document.head.appendChild(el); }
  el.textContent = css(':root[data-app-theme="light"],:root[data-app-theme="system"]', light) +
    `@media (prefers-color-scheme: dark){${css(':root[data-app-theme="system"]:not([data-theme="light"])', dark)}}` +
    css(':root[data-app-theme="dark"],:root[data-app-theme="system"][data-theme="dark"]', dark);
  setThemeColorMeta(cols.accent);
}
function setThemeColorMeta(color) { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', color); }

/* ---------- Interface (section « Couleurs » des réglages) ----------
   Simple : une palette d'un geste, ou « Ma couleur » (une seule couleur, le reste est calculé).
   Les cinq couleurs séparées restent accessibles dans « Réglages avancés ». */
function colorSettingsHTML() {
  const c = S().colors || { preset: 'prune' }, cols = currentColors(), cur = c.preset || 'prune';
  const base = c.preset === 'custom' ? (c.base || cols.accent) : cols.accent;
  return `<div class="colors">
    <div class="swatches" role="group" aria-label="Palettes de couleurs">
      ${Object.entries(COLOR_PRESETS).map(([k, p]) => `<button type="button" class="swatch" data-act="col-preset" data-p="${k}" aria-pressed="${cur === k}" title="${esc(p.name)}">
        <span class="dot" aria-hidden="true" style="background:linear-gradient(135deg, ${p.accent} 0 55%, ${p.bg} 55% 100%)">${icon('check', 'sm')}</span><span class="nm">${esc(p.name.replace(' (d’origine)', ''))}</span></button>`).join('')}
      <label class="swatch mine" for="col-base" data-on="${cur === 'custom'}">
        <span class="dot" aria-hidden="true" style="background:${base}"><input type="color" id="col-base" data-col="base" value="${base}" aria-label="Choisir ma couleur"></span><span class="nm">Ma couleur</span></label>
    </div>
    <p class="help" id="col-note">${colorNote()}</p>
    <div class="color-preview" aria-hidden="true" id="col-preview">${colorPreviewInner(cols)}</div>
    <details class="col-adv"><summary>Réglages avancés : choisir chaque couleur séparément</summary>
      <div class="color-grid">
        ${COLOR_FIELDS.map(([k, l, d]) => `<label class="color-field" for="col-${k}"><input type="color" id="col-${k}" data-col="${k}" value="${cols[k]}"><span><strong>${l}</strong><small>${d}</small><code id="col-${k}-hex">${cols[k]}</code></span></label>`).join('')}
      </div>
      <div id="col-report">${colorReportHTML()}</div>
      <p class="help">En thème sombre, l’accent et la couleur des accords sont éclaircis automatiquement pour rester lisibles.</p>
    </details>
    <div class="row"><button class="btn btn-ghost sm" data-act="col-reset" ${cur === 'prune' ? 'disabled' : ''}>Revenir aux couleurs d’origine</button></div>
  </div>`;
}
function colorNote() {
  const c = S().colors || {}, bad = colorReport().filter((r) => !r.ok);
  if (bad.length) return `${icon('info', 'sm')} Certaines couleurs sont peu lisibles (${esc(bad.map((r) => r.label.toLowerCase()).join(', '))}). Choisissez une palette ou « Ma couleur » pour un réglage automatique.`;
  if (c.preset === 'custom' && c.base && c.accent && c.base !== c.accent) return `${icon('check', 'sm')} Votre couleur a été un peu assombrie pour que les accords et les boutons restent lisibles.`;
  if (c.preset === 'custom') return `${icon('check', 'sm')} Couleurs personnalisées, toutes lisibles.`;
  return 'Touchez une palette, ou « Ma couleur » pour choisir une seule teinte : Harmonia calcule le reste et garde tout lisible.';
}
function colorPreviewInner(cols) {
  const t = derivedTokens(cols);
  return `<div style="background:${t['--bg']};color:${t['--text']};border-color:${t['--border']}" class="cp-box">
    <div style="background:${t['--surface']};border-color:${t['--border']}" class="cp-card">
      <span class="cp-chord" style="color:${t['--chord']}">G</span><span class="cp-chord" style="color:${t['--chord']};left:118px">D</span>
      <span class="cp-lyric">Quand la musique est bonne</span>
    </div>
    <span class="cp-btn" style="background:${t['--accent']};color:${t['--accent-ink']}">Lecture</span>
    <span class="cp-btn2" style="background:${t['--lav']};color:${t['--text']}">Accordeur</span>
  </div>`;
}
function colorReportHTML() {
  return `<ul class="contrast-list">${colorReport().map((r) => `<li class="${r.ok ? 'ok' : 'ko'}">${icon(r.ok ? 'check' : 'info', 'sm')}<span>${esc(r.label)}</span><b class="num">${fmtNum(r.ratio, 1)} : 1</b><em>${r.ok ? 'lisible' : `peu lisible (minimum ${fmtNum(r.min, 1)})`}</em></li>`).join('')}</ul>`;
}
function onColorInput(input) {
  const k = input.dataset.col, v = input.value.toUpperCase();
  if (k === 'base') {
    const p = paletteFromColor(v); delete p.adjusted;
    S().colors = cleanColors({ ...p, preset: 'custom' });
  } else {
    const c = { ...currentColors(), ...(S().colors && S().colors.preset === 'custom' ? S().colors : {}), preset: 'custom' };
    c[k] = v; delete c.base;
    S().colors = cleanColors(c);
  }
  applyCustomColors();
  const cols = currentColors();
  COLOR_FIELDS.forEach(([f]) => { const inp = $(`#col-${f}`); if (inp && inp !== input) inp.value = cols[f].toLowerCase(); const hx = $(`#col-${f}-hex`); if (hx) hx.textContent = cols[f]; });
  const pv = $('#col-preview'); if (pv) pv.innerHTML = colorPreviewInner(cols);
  const rp = $('#col-report'); if (rp) rp.innerHTML = colorReportHTML();
  const nt = $('#col-note'); if (nt) nt.innerHTML = colorNote();
  $$('button.swatch').forEach((b) => b.setAttribute('aria-pressed', 'false')); const mn = $('.swatch.mine'); if (mn) mn.dataset.on = 'true';
  const bd = $('.swatch.mine .dot'); if (bd) bd.style.background = S().colors.base || cols.accent;
  const rs = $('[data-act="col-reset"]'); if (rs) rs.disabled = false;
  save();
}
