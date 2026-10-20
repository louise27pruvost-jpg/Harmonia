/* Harmonia — événements et démarrage */
'use strict';
/* ===================================================================
   Gestion des événements (délégation)
   =================================================================== */
const ACTIONS = {
  nav: (el) => go(el.dataset.view),
  open: (el) => openSong(el.dataset.id),
  back: () => go(ui.prev && ui.prev !== 'song' && ui.prev !== 'edit' ? ui.prev : 'library'),
  fav: (el) => {
    const s = songById(el.dataset.id); if (!s) return;
    s.fav = !s.fav;
    $$(`.fav-btn[data-id="${s.id}"]`).forEach((b) => { b.setAttribute('aria-pressed', s.fav); b.setAttribute('aria-label', (s.fav ? 'Retirer des favoris' : 'Ajouter aux favoris') + (b.closest('.song-row') ? ' : ' + s.title : '')); b.classList.remove('pop'); void b.offsetWidth; if (s.fav) b.classList.add('pop'); });
    commit(s.fav ? 'Ajoutée aux favoris' : 'Retirée des favoris', '');
    if (ui.view === 'library' && ui.lib.tab === 'fav' && !s.fav) render();
  },
  libtab: (el) => { ui.lib.tab = el.dataset.tab; ui.lib.openPl = null; go('library', { keepScroll: false }); },
  libpl: (el) => { ui.lib.tab = 'playlists'; ui.lib.openPl = el.dataset.id; go('library'); setTimeout(() => $('#pl-' + el.dataset.id)?.scrollIntoView({ block: 'start' }), 30); },
  new: (el) => { draft = null; ui._newTitle = el.dataset.title || ''; closeModal(); go('edit', { editId: null }); },
  edit: (el) => { draft = null; go('edit', { editId: el.dataset.id }); },
  import: (el) => openImport({ mode: el.dataset.mode || 'paste' }),
  'modal-close': () => closeModal(),
  'imp-mode': (el) => { setImpMode(el.dataset.mode); $('#imp-msg').innerHTML = ''; },
  'imp-swap': () => { const t = impValue('title'), a = impValue('artist'); imp.over.title = a; imp.over.artist = t; renderAnalysis(); },
  'imp-create': () => {
    if (!imp.res) { impMsg('Collez d’abord le texte d’une chanson.', 'warn'); $('#imp-paste')?.focus(); return; }
    if (!imp.res.body.trim()) { impMsg('Le texte collé ne contient ni paroles ni accords après nettoyage.', 'err'); return; }
    const s = impSong(); store.songs.push(s); closeModal(); commit('Chanson importée'); openSong(s.id);
  },
  'imp-editor': () => {
    if (!imp.res) { impMsg('Collez d’abord le texte d’une chanson.', 'warn'); return; }
    draft = impSong(); draft.source = 'import'; closeModal(); go('edit', { editId: null });
  },
  'cat-add': (el) => { const c = CATALOG.find((x) => x.id === el.dataset.id); const s = c && addFromCatalog(c); if (s) { commit(`« ${c.title} » ajoutée à la bibliothèque`, 'ok'); const y = window.scrollY; render(); window.scrollTo(0, y); $(`[data-act="open"][data-id="${s.id}"]`)?.focus(); } },
  'cat-add-all': () => { let n = 0; CATALOG.forEach((c) => { if (addFromCatalog(c)) n++; }); commit(`${n} chanson${n > 1 ? 's ajoutées' : ' ajoutée'} à la bibliothèque`, 'ok'); const y = window.scrollY; render(); window.scrollTo(0, y); },
  'cat-tag': (el) => { ui.lib.catTag = el.dataset.tag; const y = window.scrollY; render(); window.scrollTo(0, y); },
  sfield: (el) => { ui.search.field = el.dataset.field; ui._focusSearch = true; render(); },
  sfav: () => { ui.search.favOnly = !ui.search.favOnly; render(); },
  'pl-new': () => askText('Nouvelle playlist', 'Nom de la playlist', '', 'Créer', (n) => { const p = createPlaylist(n); if (p) { commit(`Playlist « ${p.name} » créée`); ui.lib.tab = 'playlists'; ui.lib.openPl = p.id; go('library'); } }),
  'pl-toggle': (el) => { ui.lib.openPl = ui.lib.openPl === el.dataset.id ? null : el.dataset.id; render(); $(`[data-act="pl-toggle"][data-id="${el.dataset.id}"]`)?.focus(); },
  'pl-rename': (el) => { const p = store.playlists.find((x) => x.id === el.dataset.id); askText('Renommer la playlist', 'Nouveau nom', p.name, 'Renommer', (n) => { p.name = n; render(); commit('Playlist renommée'); }); },
  'pl-delete': (el) => { const p = store.playlists.find((x) => x.id === el.dataset.id); askConfirm('Supprimer la playlist', `La playlist « ${esc(p.name)} » sera supprimée. Les chansons restent dans votre bibliothèque.`, 'Supprimer', () => { store.playlists = store.playlists.filter((x) => x !== p); render(); commit('Playlist supprimée'); }); },
  'pl-move': (el) => { const p = store.playlists.find((x) => x.id === el.dataset.id); const i = p.songIds.indexOf(el.dataset.song), j = i + Number(el.dataset.dir); if (j < 0 || j >= p.songIds.length) return; [p.songIds[i], p.songIds[j]] = [p.songIds[j], p.songIds[i]]; save(); render(); $(`[data-act="pl-move"][data-song="${el.dataset.song}"][data-dir="${el.dataset.dir}"]`)?.focus(); },
  'pl-remove': (el) => { const p = store.playlists.find((x) => x.id === el.dataset.id); p.songIds = p.songIds.filter((x) => x !== el.dataset.song); render(); commit('Retirée de la playlist'); },
  'pl-pick': () => openPlaylistPicker(),
  file: (el) => openPlaylistPicker(el.dataset.id),
  'cat-fav': (el) => {
    const c = CATALOG.find((x) => x.id === el.dataset.id); if (!c) return;
    let s = catalogOwned(c);
    let msg;
    if (!s) { s = addFromCatalog(c); s.fav = true; msg = `« ${c.title} » ajoutée à la bibliothèque et aux favoris`; }
    else { s.fav = !s.fav; msg = s.fav ? 'Ajoutée aux favoris' : 'Retirée des favoris'; }
    commit(msg);
    const y = window.scrollY; render(); window.scrollTo(0, y);
    $(`[data-act="cat-fav"][data-id="${c.id}"]`)?.focus({ preventScroll: true });
  },
  'cat-file': (el) => {
    const c = CATALOG.find((x) => x.id === el.dataset.id); if (!c) return;
    let s = catalogOwned(c);
    if (!s) { s = addFromCatalog(c); commit(`« ${c.title} » ajoutée à la bibliothèque`, 'ok'); }
    openPlaylistPicker(s.id);
  },
  menu: () => { ui.menuOpen = !ui.menuOpen; rerenderSongHead(); if (ui.menuOpen) $('.menu button')?.focus(); },
  dup: () => { const s = currentSong(); const c = makeSong({ ...s, id: undefined, title: s.title + ' (copie)', fav: false, createdAt: undefined, updatedAt: undefined, lastOpened: 0, source: 'manual' }, 'manual'); store.songs.push(c); commit('Copie créée'); openSong(c.id); },
  'exp-cho': () => { ui.menuOpen = false; rerenderSongHead(); const s = currentSong(); offerFile(safeName(s.title) + '.chordpro.txt', songToChordPro(s), 'Exporter en ChordPro'); },
  'exp-json': () => { ui.menuOpen = false; rerenderSongHead(); const s = currentSong(); offerFile(safeName(s.title) + '.json', JSON.stringify({ ...s }, null, 2), 'Exporter en JSON'); },
  'del-song': () => { ui.menuOpen = false; rerenderSongHead(); const s = currentSong(); askConfirm('Supprimer la chanson', `« ${esc(s.title)} » sera définitivement supprimée de la bibliothèque et des playlists. Exportez-la d’abord si vous souhaitez la garder.`, 'Supprimer', () => {
    store.songs = store.songs.filter((x) => x.id !== s.id); store.playlists.forEach((p) => { p.songIds = p.songIds.filter((x) => x !== s.id); });
    store.history = store.history.filter((x) => x !== s.id); if (store.lastSongId === s.id) store.lastSongId = null; commit('Chanson supprimée'); go('library'); }); },
  tp: (el) => { const s = currentSong(); s.transpose = clamp((s.transpose || 0) + Number(el.dataset.d), -11, 11); if (Math.abs(s.transpose) === 12) s.transpose = 0; save(); updateTranspose(); },
  'ex-changes': (el) => openChangesExercise(el.dataset.a, el.dataset.b, el.dataset.key),
  'chg-start': () => startChangeTimer(),
  'chg-plus': () => bumpCount(),
  'chg-model': () => toggleModel(),
  'chg-file': () => { const f = $('#chg-file'); if (f) f.click(); },
  'play-chord': (el) => playChordNow(el.dataset.chord),
  'cp-play': () => playChordNow(cp.name),
  'take-del': (el) => takeDelete(el.dataset.id).then(() => { refreshTakes(); toast('Prise supprimée'); }).catch(() => toast('La prise n’a pas pu être supprimée.', 'err')),
  'chg-stop': () => { if (chg.running) finishChangeTimer(); else closeModal(); },
  'ex-rhythm': () => { $('#metronome')?.scrollIntoView({ behavior: S().reduceMotion ? 'auto' : 'smooth', block: 'start' }); $('#metro-toggle')?.focus({ preventScroll: true }); },
  'ex-song': (el) => { const c = CATALOG.find((x) => x.id === el.dataset.cid); if (!c) return; let s = catalogOwned(c); if (!s) { s = addFromCatalog(c); commit(`« ${c.title} » ajoutée à la bibliothèque`); } openSong(s.id); },
  'metro-toggle': (el) => { if (metro.on) metroStop(); else metroStart(Number($('#metro-bpm')?.value) || metro.bpm); el.innerHTML = metro.on ? icon('stop', 'sm') + 'Arrêter' : icon('play', 'sm') + 'Démarrer'; },
  'metro-bpm': (el) => { metro.bpm = clamp(metro.bpm + Number(el.dataset.d), 30, 220); const r = $('#metro-bpm'); if (r) r.value = metro.bpm; $('#metro-out').textContent = metro.bpm + ' BPM'; },
  'metro-beats': (el) => { metro.beats = Number(el.dataset.n); $$('[data-act="metro-beats"]').forEach((b) => b.setAttribute('aria-pressed', b === el)); $('#metro-beats').innerHTML = Array.from({ length: metro.beats }, (_, i) => `<span data-b="${i}"></span>`).join(''); },
  'track-on': () => { S().trackPractice = true; render(); commit('Suivi de la pratique réactivé'); },
  'clear-stats': () => askConfirm('Effacer les statistiques', 'Le temps de pratique, les séances, les scores d’exercices et les prises enregistrées seront effacés. Vos chansons ne sont pas touchées.', 'Effacer', () => { store.practice = { sessions: [], exercises: {} }; takesClearAll().catch(() => {}); render(); commit('Statistiques effacées'); }),
  'col-preset': (el) => {
    const p = el.dataset.p;
    if (p === 'custom') S().colors = cleanColors({ ...currentColors(), ...(S().colors && S().colors.preset === 'custom' ? S().colors : {}), preset: 'custom' });
    else S().colors = { preset: p };
    applyCustomColors(); const y = window.scrollY; render(); window.scrollTo(0, y);
    commit(p === 'custom' ? 'Choisissez vos couleurs ci-dessous' : `Palette « ${COLOR_PRESETS[p].name} » appliquée`, '');
  },
  'col-reset': () => { S().colors = { preset: 'prune' }; applyCustomColors(); const y = window.scrollY; render(); window.scrollTo(0, y); commit('Couleurs d’origine rétablies', ''); },
  'capo-real': () => { const s = currentSong(); s.transpose = clamp(Number(s.capo) || 0, -11, 11); save(); rerenderSongHead(); toast(`Transposé de +${s.capo} : son réel de la version guitare avec capo`); },
  'tp-reset': () => { const s = currentSong(); s.transpose = 0; save(); updateTranspose(); },
  size: (el) => { S().textScale = Math.round(clamp(S().textScale + Number(el.dataset.d) * 0.1, 0.8, 1.6) * 100) / 100; save(); $('#reader').style.setProperty('--scale', S().textScale); $('#size-out').textContent = Math.round(S().textScale * 100) + ' %'; },
  tabs: (el) => { S().showTabs = !S().showTabs; save(); $('#reader').classList.toggle('hide-tabs', !S().showTabs); el.setAttribute('aria-pressed', S().showTabs); el.textContent = (S().showTabs ? 'Masquer' : 'Afficher') + ' la tablature'; },
  tabzoom: (el) => { ui.tabZoom = clamp(Math.round((ui.tabZoom + Number(el.dataset.d) * 0.15) * 100) / 100, 0.7, 2); $('#reader').style.setProperty('--tabzoom', ui.tabZoom); },
  focus: (el) => { ui.focus = !ui.focus; $('#reader').classList.toggle('focus-mode', ui.focus); el.setAttribute('aria-pressed', ui.focus); },
  chord: (el) => openChordPanel(el.dataset.chord, el),
  'cp-close': () => closeChordPanel(true),
  'cp-pin': () => { cp.pinned = !cp.pinned; renderChordPanel(); },
  'cp-prev': () => { cp.idx = Math.max(0, cp.idx - 1); renderChordPanel(); },
  'cp-next': () => { cp.idx++; renderChordPanel(); },
  'sc-play': () => (sc.playing ? scrollPause() : scrollPlay()),
  'sc-top': () => { window.scrollTo({ top: 0, behavior: S().reduceMotion ? 'auto' : 'smooth' }); sc.acc = 0; },
  'sc-stop': () => { scrollStop(); },
  'sc-speed': (el) => setSpeed(S().scrollSpeed + Number(el.dataset.d) * 0.1),
  'ed-ins-chord': () => { const c = $('#ed-chord').value.trim(); if (!c) { $('#ed-chord').focus(); return; } insertAtCursor($('#ed-body'), `[${c}]`); },
  'ed-chip': (el) => insertAtCursor($('#ed-body'), `[${el.dataset.c}]`),
  'ed-sec': (el) => {
    const k = el.dataset.k, ta = $('#ed-body');
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    const map = { verse: ['{start_of_verse: Couplet}', '{end_of_verse}'], chorus: ['{start_of_chorus}', '{end_of_chorus}'], bridge: ['{start_of_bridge}', '{end_of_bridge}'] };
    if (k === 'label') insertAtCursor(ta, '{comment: Intro}\n');
    else insertAtCursor(ta, `${map[k][0]}\n${sel || ''}${sel ? '' : '\n'}\n${map[k][1]}\n`.replace(/\n\n\n/, '\n\n'));
  },
  'ed-convert': () => {
    const ta = $('#ed-body');
    const before = ta.value;
    const after = plainToChordPro(before);
    if (after === before) { toast('Aucune ligne d’accords au-dessus des paroles n’a été trouvée.'); return; }
    ta.value = after; updatePreview(); toast('Accords convertis au format ChordPro', 'ok');
  },
  'ed-cancel': () => { const id = draft && songById(draft.id) ? draft.id : null; draft = null; if (id) go('song', { songId: id }); else go(ui.prev || 'library'); },
  'tn-start': () => tunerStart(),
  'tn-stop': () => tunerStop(),
  'tn-ref': () => playRef(),
  'tn-target': (el) => { tn.target = el.dataset.t === 'auto' ? 'auto' : Number(el.dataset.t); $$('#tn-strings button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t) === String(tn.target))); },
  set: (el) => { S()[el.dataset.k] = el.dataset.v; save(); applySettings(); render(); },
  'exp-backup': () => offerFile(`harmonia-bibliotheque-${new Date().toISOString().slice(0, 10)}.json`, backupData(), 'Exporter la bibliothèque', markExported),
  install: async () => { if (!pwa.prompt) return; pwa.prompt.prompt(); try { await pwa.prompt.userChoice; } catch (e) { /* rien */ } pwa.prompt = null; render(); },
  'exp-allcho': () => offerFile(`harmonia-chansons-${new Date().toISOString().slice(0, 10)}.txt`, store.songs.map(songToChordPro).join('\n{new_song}\n\n'), 'Exporter toutes les chansons'),
  'clear-history': () => askConfirm('Effacer l’historique', 'La liste des chansons récemment consultées sera vidée. Vos chansons ne sont pas supprimées.', 'Effacer', () => { store.history = []; store.lastSongId = null; store.songs.forEach((s) => { s.lastOpened = 0; }); render(); commit('Historique effacé'); }),
  'reset-all': () => askConfirm('Effacer les données locales', 'Toutes vos chansons, playlists, l’historique et les préférences seront effacés de ce navigateur, puis les chansons d’exemple seront rétablies. <strong>Cette action est définitive.</strong> Exportez d’abord votre bibliothèque si vous voulez la garder.', 'Tout effacer', () => { store = freshStore(); applySettings(); go('home'); commit('Données locales effacées, chansons d’exemple rétablies'); })
};
function rerenderSongHead() {
  const y = window.scrollY;
  const scroll = { playing: sc.playing };
  main.innerHTML = viewSong();
  afterSong();
  window.scrollTo(0, y);
  if (scroll.playing) syncScrollUI();
  if (cp.open) highlightChord(cp.name);
}
function updateTranspose() {
  const s = currentSong();
  const n = s.transpose || 0;
  const ctx = songCtx(s);
  $('#tp-out').innerHTML = s.key ? `${esc(ctx.keyName)}<small>${n ? (n > 0 ? '+' : '−') + Math.abs(n) + ' demi-ton' + (Math.abs(n) > 1 ? 's' : '') : 'd’origine'}</small>` : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}<small>demi-tons</small>`;
  $('[data-act="tp-reset"]').disabled = !n;
  const mini = $('#tp-mini'); if (mini) mini.textContent = s.key ? ctx.keyName : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
  refreshSongBody();
  // Les noms d'accords changent : le diagramme ouvert ne correspond plus
  if (cp.open) closeChordPanel(true);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (ui.menuOpen && !e.target.closest('.rd-actions')) { ui.menuOpen = false; rerenderSongHead(); }
  if (!el) {
    if (cp.open && !cp.pinned && !e.target.closest('#chord-panel')) closeChordPanel();
    return;
  }
  if (el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('submit', (e) => {
  const f = e.target.dataset.form;
  if (!f) return;
  e.preventDefault();
  if (f === 'home-search') { ui.search.q = $('#home-q').value; ui._focusSearch = true; go('search'); }
  else if (f === 'edit') saveDraft();
  else if (f === 'pl-create') { const p = createPlaylist($('#pl-name').value); if (p) { ui.lib.openPl = p.id; render(); commit(`Playlist « ${p.name} » créée`); } }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.col) { onColorInput(t); return; }
  if (t.id === 'search-q') {
    ui.search.q = t.value;
    const pos = t.selectionStart;
    render();
    const i = $('#search-q'); i.focus(); i.setSelectionRange(pos, pos);
  } else if (t.id === 'lib-q') {
    ui.lib.q = t.value; const pos = t.selectionStart; render(); const i = $('#lib-q'); i.focus(); i.setSelectionRange(pos, pos);
  } else if (t.id === 'sc-range') setSpeed(Number(t.value));
  else if (t.id === 'set-scale') { S().textScale = Number(t.value); $('#set-scale-out').textContent = Math.round(S().textScale * 100) + ' %'; save(); }
  else if (t.id === 'set-speed') { S().scrollSpeed = Number(t.value); $('#set-speed-out').textContent = '×' + fmtNum(S().scrollSpeed); save(); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'lib-sort') { ui.lib.sort = t.value; render(); $('#lib-sort').focus(); }
  else if (t.dataset.inst) setInstrument(t.value);
  else if (t.dataset.set) { S()[t.dataset.set] = t.checked; save(); applySettings(); }
  else if (t.id === 'set-tuning') { S().tuning = t.value; tn.target = 'auto'; save(); }
  else if (t.id === 'set-a4') { const v = Math.round(Number(t.value)); if (v >= 415 && v <= 466) { S().a4 = v; commit(`Diapason : La = ${v} Hz`); } else { t.value = S().a4; toast('Choisissez une valeur entre 415 et 466 Hz.', 'err'); } }
  else if (t.id === 'set-tol') { S().tolerance = Number(t.value); save(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' && chg.running && modal.open && (e.target.tagName || '').toLowerCase() !== 'input') { e.preventDefault(); ACTIONS['chg-plus'](); return; }
  if (e.key === 'Escape') {
    if (ui.menuOpen) { ui.menuOpen = false; rerenderSongHead(); $('[data-act="menu"]')?.focus(); return; }
    if (cp.open) { closeChordPanel(true); return; }
  }
  if (ui.view !== 'song' || modal.open) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  if (e.key === ' ') {
    if (tag === 'button' || tag === 'summary') return;
    e.preventDefault(); sc.playing ? scrollPause() : scrollPlay();
  } else if (e.key === 'ArrowRight' && sc.started) { e.preventDefault(); setSpeed(S().scrollSpeed + 0.05); }
  else if (e.key === 'ArrowLeft' && sc.started) { e.preventDefault(); setSpeed(S().scrollSpeed - 0.05); }
});
document.addEventListener('paste', (e) => {
  const imgFile = e.clipboardData && [...(e.clipboardData.files || [])].find((f) => /^image\//.test(f.type));
  if (imgFile) {
    // capture d'écran collée : lecture par reconnaissance de texte
    if (modal.open && imp.mode && $('#imp-scan-pane')) { e.preventDefault(); handleScan(imgFile); return; }
    if (!modal.open && ['home', 'search', 'library'].includes(ui.view)) { e.preventDefault(); openImport({ mode: 'scan', scanFile: imgFile }); return; }
  }
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable || modal.open) return;
  if (!['home', 'search', 'library'].includes(ui.view)) return;
  const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
  if (!text || text.trim().split('\n').length < 2) return;
  e.preventDefault();
  openImport({ mode: 'paste', text });
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && sc.playing) wakeLock(true); });


/* ---------- Installation (PWA) et hors ligne ---------- */
const pwa = { prompt: null, installed: false, sw: 'non disponible', offline: !navigator.onLine };
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pwa.prompt = e; if (ui.view === 'settings') render(); });
window.addEventListener('appinstalled', () => { pwa.installed = true; pwa.prompt = null; toast('Harmonia est installée sur cet appareil', 'ok'); if (ui.view === 'settings') render(); });
window.addEventListener('online', () => { pwa.offline = false; if (ui.view === 'settings') render(); });
window.addEventListener('offline', () => { pwa.offline = true; toast('Vous êtes hors ligne : vos chansons restent accessibles.'); if (ui.view === 'settings') render(); });
function isStandalone() { return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
async function registerServiceWorker() {
  if (window.HARMONIA_EMBED) { pwa.sw = 'indisponible dans l’aperçu intégré'; return; }
  if (location.protocol === 'file:') { pwa.sw = 'indisponible en ouvrant le fichier directement (servez Harmonia en http ou https)'; return; }
  if (!('serviceWorker' in navigator)) { pwa.sw = 'non pris en charge par ce navigateur'; return; }
  if (!window.isSecureContext) { pwa.sw = 'page non sécurisée (https ou localhost requis)'; return; }
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    pwa.sw = reg.active ? 'prêt' : 'installation en cours';
    navigator.serviceWorker.ready.then(() => { pwa.sw = 'prêt'; if (ui.view === 'settings') render(); });
  } catch (e) { pwa.sw = 'échec de l’installation (' + (e && e.message || e) + ')'; }
}

/* ---------- Démarrage ---------- */
(async function start() {
  main.innerHTML = '<div class="view" aria-busy="true"><div class="empty"><p>Chargement de votre bibliothèque…</p></div></div>';
  store = await loadStore();
  applySettings();
  if (/^#(accordeur|tuner)$/.test(location.hash)) ui.view = 'tuner';
  else if (/^#(bibliotheque|library)$/.test(location.hash)) ui.view = 'library';
  else if (/^#(recherche|search)$/.test(location.hash)) ui.view = 'search';
  render();
  if (migratedFromLegacy) toast('Votre bibliothèque a été transférée vers le nouveau stockage (IndexedDB).', 'ok');
  if (storageMode === 'memory') toast('Ce navigateur bloque l’enregistrement : vos changements seront perdus à la fermeture. Exportez la bibliothèque avant de partir.', 'err');
  onExternalChange = () => {
    applySettings();
    if (ui.view === 'edit') return; // ne pas perturber une saisie en cours
    if (ui.view === 'song' && !currentSong()) { go('library'); toast('Cette chanson a été supprimée dans un autre onglet.'); return; }
    if (ui.view === 'song') rerenderSongHead(); else { const y = window.scrollY; render(); window.scrollTo(0, y); }
  };
  requestPersistence();
  registerServiceWorker();
})();
