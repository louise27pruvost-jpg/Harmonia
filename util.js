/* Harmonia — utilitaires communs et icônes */
'use strict';
/* ---------- Petits utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const fmtNum = (n, d = 2) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

const ICONS = {
  home: '<path d="M4 11.2 12 4.8l8 6.4V19a1 1 0 0 1-1 1h-4.6v-5.2H9.6V20H5a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/>',
  library: '<path d="M5 4.5h3.4v15H5zM10.6 4.5H14v15h-3.4z"/><path d="m15.6 6.1 3.2-.9 3 13.9-3.2.9z"/>',
  heart: '<path d="M12 19.6s-7.2-4.4-7.2-9.6A4 4 0 0 1 12 7.9 4 4 0 0 1 19.2 10c0 5.2-7.2 9.6-7.2 9.6z"/>',
  tuner: '<path d="M8.5 3v7.2a3.5 3.5 0 0 0 7 0V3"/><path d="M12 13.7V21"/>',
  settings: '<path d="M4 7h9M18 7h2M4 17h4M13 17h7"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="10.5" cy="17" r="2.3"/>',
  import: '<path d="M12 4v11m0 0-4.2-4.2M12 15l4.2-4.2"/><path d="M5 16.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5"/>',
  export: '<path d="M12 15V4m0 0L7.8 8.2M12 4l4.2 4.2"/><path d="M5 16.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5"/>',
  play: '<path d="M8 5.6v12.8l10-6.4z"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="2.6"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  rewind: '<path d="M6 5.5v13"/><path d="M18 6.2 9.5 12l8.5 5.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  next: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  listplus: '<path d="M4 7h11M4 12h11M4 17h7M18 14v7M14.5 17.5h7"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  edit: '<path d="M5 19h3.8L19 8.8 15.2 5 5 15.2z"/><path d="m13.5 6.7 3.8 3.8"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12.2a1 1 0 0 0 1 .8h6a1 1 0 0 0 1-.8L17 7"/>',
  up: '<path d="m6.5 14.5 5.5-5.5 5.5 5.5"/>',
  down: '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
  file: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4"/>',
  note: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  pin: '<path d="M9 4h6l-1 5 3 3v1.5H7V12l3-3z"/><path d="M12 13.5V20"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  arrowup: '<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>',
  arrowdown: '<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>',
  speaker: '<path d="M5 9.5h3l4.5-4v13L8 14.5H5z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 0 1 1-1h9"/>',
  text: '<path d="M4 18 8.5 6h1L14 18M5.6 14h6.8M15 18l2.8-7h.6l2.6 7M15.9 16h4.3"/>',
  focus: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>',
  chart: '<path d="M4 20h16"/><rect x="6" y="11" width="3" height="7" rx="1"/><rect x="11" y="6" width="3" height="12" rx="1"/><rect x="16" y="9" width="3" height="9" rx="1"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 13V9.5M10 3h4"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

