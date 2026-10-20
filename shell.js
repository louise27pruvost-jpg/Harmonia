/* Harmonia — interface : coquille, navigation, accueil, recherche, bibliothèque */
'use strict';
/* ===================================================================
   Modale et notifications
   =================================================================== */
const modal = $('#modal');
let modalReturn = null;
function openModal(html) {
  modalReturn = document.activeElement;
  modal.classList.remove('wide');
  modal.innerHTML = html;
  if (!modal.open) { try { modal.showModal(); } catch (e) { modal.setAttribute('open', ''); } }
  const f = modal.querySelector('input:not([type="hidden"]):not(.sr-only), textarea:not([readonly]), button.btn-primary');
  f?.focus();
}
function closeModal() { if (modal.open) modal.close(); else modal.dispatchEvent(new Event('close')); if (typeof onExerciseModalClosed === 'function') onExerciseModalClosed(); modal.innerHTML = ''; modal.classList.remove('wide'); modalReturn?.focus?.({ preventScroll: true }); }
modal.addEventListener('close', () => {
  if (typeof onExerciseModalClosed === 'function') onExerciseModalClosed();
  modal.innerHTML = ''; modal.classList.remove('wide');
  if (modal.dataset.refresh) { delete modal.dataset.refresh; if (ui.view === 'song') rerenderSongHead(); else { const y = window.scrollY; render(); window.scrollTo(0, y); } }
});
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
function toast(text, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = text;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

/* ===================================================================
   Coquille de l'application : navigation et vues
   =================================================================== */
const NAV = [
  { id: 'home', label: 'Accueil', icon: 'home' },
  { id: 'search', label: 'Recherche', icon: 'search' },
  { id: 'library', label: 'Bibliothèque', icon: 'library' },
  { id: 'tuner', label: 'Accordeur', icon: 'tuner' },
  { id: 'progress', label: 'Progression', icon: 'chart', desktop: true },
  { id: 'settings', label: 'Réglages', icon: 'settings' }
];
const ui = {
  view: 'home', songId: null, editId: null, prev: 'home',
  search: { q: '', field: 'all', favOnly: false },
  lib: { tab: 'all', sort: 'title', q: '', openPl: null, catTag: '' },
  menuOpen: false, focus: false, tabZoom: 1
};
const main = $('#main');

function renderNav() {
  const active = ui.view === 'song' || ui.view === 'edit' ? 'library' : ui.view;
  const btn = (n, side) => `<button type="button" data-act="nav" data-view="${n.id}" ${active === n.id ? 'aria-current="page"' : ''}>${icon(n.icon, side ? '' : 'lg')}<span>${n.label}</span></button>`;
  $('#sidenav-links').innerHTML = NAV.map((n) => btn(n, true)).join('');
  $('#tabbar').innerHTML = NAV.filter((n) => !n.desktop).map((n) => btn(n, false)).join('');
}
function go(view, opts = {}) {
  if (ui.view === 'tuner' && view !== 'tuner') tunerStop(false, true);
  if (ui.view === 'song' && view !== 'song') { scrollStop(); closeChordPanel(true); practiceStop(); }
  if (view !== 'progress') { metroStop(); stopChangeTimer(); }
  if (typeof stopLoop === 'function') stopLoop();
  if (view !== ui.view && ui.view !== 'edit' && ui.view !== 'song') ui.prev = ui.view;
  ui.view = view;
  if (opts.songId !== undefined) ui.songId = opts.songId;
  if (opts.editId !== undefined) ui.editId = opts.editId;
  ui.menuOpen = false;
  document.body.classList.toggle('in-reader', view === 'song');
  render();
  const keepFocus = document.activeElement && document.activeElement.id === 'search-q';
  if (!opts.keepScroll) window.scrollTo(0, 0);
  if (opts.focusMain !== false && !keepFocus) main.focus({ preventScroll: true });
}
function render() {
  renderNav();
  const v = ui.view;
  const html = v === 'home' ? viewHome() : v === 'search' ? viewSearch() : v === 'library' ? viewLibrary()
    : v === 'tuner' ? viewTuner() : v === 'settings' ? viewSettings() : v === 'progress' ? viewProgress() : v === 'song' ? viewSong() : v === 'edit' ? viewEdit() : '';
  main.innerHTML = html;
  if (v === 'song') afterSong();
  if (v === 'edit') afterEdit();
  if (v === 'tuner') afterTuner();
  if (v === 'settings') afterSettings();
  if (v === 'progress') afterProgress();
  if (v === 'search') { const i = $('#search-q'); if (i && ui._focusSearch) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); ui._focusSearch = false; } }
}

/* ---------- Listes de chansons ---------- */
function keyClass(s) { const p = parseChord(s.key || ''); return p ? 'c' + (pcOf(p.root) % 5) : 'c0'; }
function songRow(s, extra = '') {
  const inf = songInfo(s);
  const keyLbl = s.key ? esc(s.key) : icon('note', 'sm');
  return `<li class="song-row">
    <span class="key-tab ${keyClass(s)}" aria-hidden="true">${keyLbl}</span>
    <button type="button" class="song-main" data-act="open" data-id="${s.id}">
      <span class="song-title">${esc(s.title)}</span>
      <span class="song-sub">${s.artist ? `<span>${esc(s.artist)}</span>` : '<span>Artiste non renseigné</span>'}
        <span class="avail" aria-label="Contenu disponible">
          <span class="${inf.chords ? 'on' : ''}">${inf.chords ? 'Accords' : 'Sans accords'}</span>
          <span class="${inf.lyrics ? 'on' : ''}">${inf.lyrics ? 'Paroles' : 'Sans paroles'}</span>
          ${inf.tabs ? '<span class="on">Tablature</span>' : ''}
        </span>
      </span>
    </button>
    <span class="song-actions">${extra}<button type="button" class="iconbtn plain sm" data-act="file" data-id="${s.id}" aria-label="Ranger ${esc(s.title)} dans une playlist" title="Ranger dans une playlist">${icon('listplus')}</button><button type="button" class="iconbtn plain sm fav-btn" data-act="fav" data-id="${s.id}" aria-pressed="${s.fav}" aria-label="${s.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} : ${esc(s.title)}">${icon('heart')}</button></span>
  </li>`;
}
function songList(list, emptyHtml) {
  if (!list.length) return emptyHtml || '';
  return `<ul class="songlist">${list.map((s) => songRow(s)).join('')}</ul>`;
}
function recentSongs(n = 6) { return store.history.map(songById).filter(Boolean).slice(0, n); }

/* ---------- Accueil ---------- */
function staffSVG() {
  let l = '';
  for (let i = 0; i < 5; i++) l += `<line x1="0" x2="100%" y1="${8 + i * 11}" y2="${8 + i * 11}"/>`;
  return `<svg class="staff" aria-hidden="true" preserveAspectRatio="none">${l}</svg>`;
}
function viewHome() {
  const last = songById(store.lastSongId);
  const favs = store.songs.filter((s) => s.fav).sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  const rec = recentSongs(5);
  const tuningName = curInst().name + ' · ' + (TUNINGS[S().tuning]?.name || 'Standard');
  const hour = new Date().getHours();
  const hello = hour < 6 ? 'Bonsoir' : hour < 18 ? 'Bonjour' : 'Bonsoir';
  return `<div class="view">
    <div class="mobile-top"><div class="brand"><span class="brand-mark" aria-hidden="true">${icon('note')}</span>Harmonia</div></div>
    <header class="hero">
      ${staffSVG()}
      <h1>${hello}, que joue-t-on aujourd’hui ?</h1>
      <p class="lede">Votre carnet de chansons : paroles et accords alignés, transposition, accordeur et défilement automatique.</p>
      <form class="searchbox" role="search" data-form="home-search">
        ${icon('search')}
        <label for="home-q" class="sr-only">Rechercher une chanson</label>
        <input id="home-q" class="input" type="search" placeholder="Titre ou artiste" autocomplete="off">
        <button class="btn btn-primary" type="submit">Rechercher</button>
      </form>
    </header>
    <div class="quick">
      <div class="qcard resume">
        <span class="eyebrow">Dernier morceau</span>
        ${last ? `<h3>${esc(last.title)}</h3><p>${esc(last.artist || 'Artiste non renseigné')}${last.transpose ? ` · transposé ${last.transpose > 0 ? '+' : ''}${last.transpose}` : ''}</p>
        <div class="row"><button class="btn btn-primary sm" data-act="open" data-id="${last.id}">${icon('play', 'sm')}Reprendre</button></div>`
        : `<h3>Aucun morceau ouvert</h3><p>Ouvrez une chanson de votre bibliothèque pour la retrouver ici.</p><div class="row"><button class="btn btn-ghost sm" data-act="nav" data-view="library">Voir la bibliothèque</button></div>`}
      </div>
      <div class="qcard tuner">
        <span class="eyebrow">Accordeur</span>
        <h3>${esc(tuningName)}</h3>
        <p>${esc(TUNINGS[S().tuning]?.label || '')} · La = ${S().a4} Hz</p>
        <div class="row"><button class="btn btn-primary sm" data-act="nav" data-view="tuner">${icon('tuner', 'sm')}Accorder</button></div>
      </div>
      <div class="qcard prog">
        <span class="eyebrow">Ma progression</span>
        ${(() => { const st = practiceStats(store.practice.sessions, store.songs); return `<h3>${st.week.seconds ? fmtDur(st.week.seconds) + ' cette semaine' : 'Pas encore de séance'}</h3><p>${st.streak ? `Série de ${st.streak} jour${st.streak > 1 ? 's' : ''} · ` : ''}exercices et titres conseillés selon ce que vous jouez.</p>`; })()}
        <div class="row"><button class="btn btn-primary sm" data-act="nav" data-view="progress">${icon('chart', 'sm')}Voir</button></div>
      </div>
      <div class="qcard imp">
        <span class="eyebrow">Ajouter</span>
        <h3>Nouvelle chanson</h3>
        <p>Collez une partition trouvée sur le web (<kbd>Ctrl</kbd>+<kbd>V</kbd> ici), importez un fichier ou piochez dans le répertoire libre.</p>
        <div class="row"><button class="btn btn-primary sm" data-act="import">${icon('copy', 'sm')}Coller</button><button class="btn btn-ghost sm" data-act="libtab" data-tab="free">Répertoire libre</button><button class="btn btn-ghost sm" data-act="new">Créer</button></div>
      </div>
    </div>
    ${storageOK ? '' : `<div class="notice err">${icon('info')}<p>Vos changements ne peuvent pas être enregistrés dans ce navigateur (${esc(lastSaveError || 'stockage indisponible')}). Exportez votre bibliothèque pour ne rien perdre.</p><button class="btn btn-primary sm" data-act="exp-backup">Exporter</button></div>`}
    ${storageOK && ownSongs().length && (!store.lastExport || Date.now() - store.lastExport > 30 * 864e5) ? `<div class="notice">${icon('info')}<p>${store.lastExport ? 'Votre dernière sauvegarde date de plus d’un mois.' : 'Vous n’avez pas encore sauvegardé votre bibliothèque.'} Vos chansons ne sont conservées que dans ce navigateur : un export vous protège en cas d’effacement des données.</p><button class="btn btn-soft sm" data-act="exp-backup">Exporter maintenant</button></div>` : ''}
    <section class="stack" aria-labelledby="h-recent">
      <div class="section-head"><h2 id="h-recent">Récemment consultées</h2>${rec.length ? '<button class="link" data-act="libtab" data-tab="recent">Tout voir</button>' : ''}</div>
      ${songList(rec, `<div class="empty"><p>Les chansons que vous ouvrez apparaîtront ici.</p></div>`)}
    </section>
    <section class="stack" aria-labelledby="h-fav">
      <div class="section-head"><h2 id="h-fav">Favoris</h2>${favs.length ? '<button class="link" data-act="libtab" data-tab="fav">Tout voir</button>' : ''}</div>
      ${songList(favs.slice(0, 5), `<div class="empty"><p>Touchez le cœur d’une chanson pour l’ajouter à vos favoris.</p></div>`)}
    </section>
    <section class="stack" aria-labelledby="h-pl">
      <div class="section-head"><h2 id="h-pl">Playlists</h2><button class="link" data-act="libtab" data-tab="playlists">Gérer</button></div>
      ${store.playlists.length ? `<div class="plgrid">${store.playlists.map((p) => `<button class="plcard" data-act="libpl" data-id="${p.id}"><strong>${esc(p.name)}</strong><span>${p.songIds.length} chanson${p.songIds.length > 1 ? 's' : ''}</span></button>`).join('')}</div>`
      : `<div class="empty"><p>Regroupez vos chansons par thème, par répertoire ou par soirée.</p><button class="btn btn-soft sm" data-act="pl-new">${icon('plus', 'sm')}Créer une playlist</button></div>`}
    </section>
  </div>`;
}

/* ---------- Recherche ---------- */
function searchSongs(q, field, favOnly, list = store.songs) {
  const n = norm(q);
  return list.filter((s) => {
    if (favOnly && !s.fav) return false;
    if (!n) return true;
    const t = norm(s.title), a = norm(s.artist);
    return field === 'title' ? t.includes(n) : field === 'artist' ? a.includes(n) : t.includes(n) || a.includes(n);
  }).sort((a, b) => {
    if (!n) return a.title.localeCompare(b.title, 'fr');
    const sa = norm(a.title).startsWith(n) ? 0 : 1, sb = norm(b.title).startsWith(n) ? 0 : 1;
    return sa - sb || a.title.localeCompare(b.title, 'fr');
  });
}
function viewSearch() {
  const st = ui.search;
  const res = searchSongs(st.q, st.field, st.favOnly);
  const catRes = st.q && !st.favOnly ? catalogSearch(st.q, st.field).filter((c) => !catalogOwned(c)) : [];
  const f = (id, l) => `<button type="button" data-act="sfield" data-field="${id}" aria-pressed="${st.field === id}">${l}</button>`;
  return `<div class="view">
    <header class="page-head"><h1>Recherche</h1><p>Recherche dans votre bibliothèque et dans le répertoire libre, sans tenir compte des majuscules ni des accents. Pour le reste, cherchez sur le web puis collez la partition.</p></header>
    <div class="stack">
      <div class="searchbox" role="search">
        ${icon('search')}
        <label for="search-q" class="sr-only">Titre ou artiste</label>
        <input id="search-q" class="input" type="search" placeholder="Titre, artiste ou partie du titre" value="${esc(st.q)}" autocomplete="off">
      </div>
      <div class="toolbar">
        <div class="seg" role="group" aria-label="Chercher dans">${f('all', 'Titre et artiste')}${f('title', 'Titre')}${f('artist', 'Artiste')}</div>
        <button type="button" class="tog" data-act="sfav" aria-pressed="${st.favOnly}">${icon('heart', 'sm')}Favoris uniquement</button>
      </div>
    </div>
    <section class="stack" aria-live="polite" aria-labelledby="h-res">
      <h2 id="h-res" class="num">${st.q ? `${res.length} résultat${res.length > 1 ? 's' : ''} pour « ${esc(st.q)} »` : `${res.length} chanson${res.length > 1 ? 's' : ''} dans votre bibliothèque`}</h2>
      ${songList(res, `<div class="empty"><p>Aucune chanson ne correspond à « ${esc(st.q)} »${st.favOnly ? ' parmi vos favoris' : ''}. Vérifiez l’orthographe, ou ajoutez la chanson à votre bibliothèque.</p><div class="row" style="justify-content:center"><button class="btn btn-primary sm" data-act="new" data-title="${esc(st.q)}">Créer une fiche</button><button class="btn btn-ghost sm" data-act="import">Importer un fichier</button></div></div>`)}
    </section>
    ${catRes.length ? `<section class="stack" aria-labelledby="h-cat"><div class="section-head"><h2 id="h-cat" class="num">Dans le répertoire libre · ${catRes.length}</h2><button class="link" data-act="libtab" data-tab="free">Tout le répertoire</button></div><ul class="songlist">${catRes.slice(0, 8).map(catalogRow).join('')}</ul></section>` : ''}
    ${webSearchCard(st.q)}
  </div>`;
}

/* ---------- Bibliothèque ---------- */
function libFiltered() {
  const { tab, sort, q } = ui.lib;
  let list = store.songs.slice();
  if (tab === 'fav') list = list.filter((s) => s.fav);
  else if (tab === 'recent') list = recentSongs(40);
  else if (tab === 'manual') list = list.filter((s) => s.source === 'manual');
  else if (tab === 'import') list = list.filter((s) => s.source === 'import');
  list = searchSongs(q, 'all', false, list);
  if (tab === 'recent' && !q) list = recentSongs(40);
  const cmp = {
    title: (a, b) => a.title.localeCompare(b.title, 'fr'),
    artist: (a, b) => (a.artist || '~').localeCompare(b.artist || '~', 'fr') || a.title.localeCompare(b.title, 'fr'),
    added: (a, b) => b.createdAt - a.createdAt,
    opened: (a, b) => (b.lastOpened || 0) - (a.lastOpened || 0)
  }[sort];
  if (!(tab === 'recent' && sort === 'opened')) list.sort(cmp);
  return list;
}
function viewLibrary() {
  const L = ui.lib;
  const counts = { all: store.songs.length, fav: store.songs.filter((s) => s.fav).length, playlists: store.playlists.length, recent: store.history.length, manual: store.songs.filter((s) => s.source === 'manual').length, import: store.songs.filter((s) => s.source === 'import').length, free: CATALOG.length };
  const T = [['all', 'Toutes'], ['fav', 'Favoris'], ['playlists', 'Playlists'], ['recent', 'Récentes'], ['manual', 'Créées'], ['import', 'Importées'], ['free', 'Répertoire libre']];
  const tabs = `<div class="tabs" role="group" aria-label="Filtrer la bibliothèque">${T.map(([id, l]) => `<button type="button" data-act="libtab" data-tab="${id}" aria-pressed="${L.tab === id}">${l}<span class="count">${counts[id]}</span></button>`).join('')}</div>`;
  let content;
  if (L.tab === 'playlists') content = playlistsManager();
  else if (L.tab === 'free') content = freeRepertoire();
  else {
    const list = libFiltered();
    content = `<div class="lib-controls">
        <div class="searchbox">${icon('search')}<label for="lib-q" class="sr-only">Rechercher dans la bibliothèque</label><input id="lib-q" class="input" type="search" placeholder="Rechercher dans la bibliothèque" value="${esc(L.q)}"></div>
        <label class="sr-only" for="lib-sort">Trier par</label>
        <select id="lib-sort" class="select">
          ${[['title', 'Titre'], ['artist', 'Artiste'], ['added', 'Date d’ajout'], ['opened', 'Dernière consultation']].map(([v, l]) => `<option value="${v}" ${L.sort === v ? 'selected' : ''}>Trier : ${l}</option>`).join('')}
        </select>
      </div>
      ${songList(list, `<div class="empty"><p>${L.q ? `Aucune chanson ne correspond à « ${esc(L.q)} ».` : { fav: 'Aucun favori pour l’instant.', recent: 'Aucune chanson consultée récemment.', manual: 'Vous n’avez pas encore créé de chanson.', import: 'Aucune chanson importée.', all: 'Votre bibliothèque est vide.' }[L.tab]}</p><div class="row" style="justify-content:center"><button class="btn btn-primary sm" data-act="new">Créer une fiche</button><button class="btn btn-ghost sm" data-act="import">Importer</button></div></div>`)}`;
  }
  return `<div class="view">
    <header class="toolbar"><div class="page-head"><h1>Bibliothèque</h1></div>
      <div class="row"><button class="btn btn-soft" data-act="import">${icon('import', 'sm')}Importer</button><button class="btn btn-primary" data-act="new">${icon('plus', 'sm')}Nouvelle chanson</button></div></header>
    ${tabs}
    <div class="stack">${content}</div>
  </div>`;
}
function playlistsManager() {
  const pls = store.playlists;
  const create = `<form class="row" data-form="pl-create" style="flex-wrap:nowrap"><label class="sr-only" for="pl-name">Nom de la playlist</label><input id="pl-name" class="input" placeholder="Nom de la nouvelle playlist" maxlength="60"><button class="btn btn-primary" type="submit">Créer</button></form>`;
  if (!pls.length) return create + `<div class="empty"><p>Aucune playlist. Donnez un nom à votre première playlist, puis ajoutez-y des chansons depuis leur page.</p></div>`;
  return create + pls.map((p) => {
    const songs = p.songIds.map(songById).filter(Boolean);
    const open = ui.lib.openPl === p.id;
    return `<article class="pl-item" id="pl-${p.id}">
      <div class="pl-head">
        <div><h3>${esc(p.name)}</h3><span class="muted num" style="font-size:13px">${songs.length} chanson${songs.length > 1 ? 's' : ''}</span></div>
        <div class="row">
          <button class="btn btn-ghost sm" data-act="pl-toggle" data-id="${p.id}" aria-expanded="${open}">${open ? 'Replier' : 'Afficher'}</button>
          <button class="iconbtn sm" data-act="pl-rename" data-id="${p.id}" aria-label="Renommer ${esc(p.name)}">${icon('edit', 'sm')}</button>
          <button class="iconbtn sm" data-act="pl-delete" data-id="${p.id}" aria-label="Supprimer ${esc(p.name)}">${icon('trash', 'sm')}</button>
        </div>
      </div>
      ${open ? (songs.length ? `<ol class="pl-songs">${songs.map((s, i) => `<li>
          <button class="t" data-act="open" data-id="${s.id}" data-pl="${p.id}">${esc(s.title)} <span>· ${esc(s.artist || '—')}</span></button>
          <span class="row" style="gap:2px;flex-wrap:nowrap">
            <button class="iconbtn plain sm" data-act="pl-move" data-id="${p.id}" data-song="${s.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter ${esc(s.title)}">${icon('up', 'sm')}</button>
            <button class="iconbtn plain sm" data-act="pl-move" data-id="${p.id}" data-song="${s.id}" data-dir="1" ${i === songs.length - 1 ? 'disabled' : ''} aria-label="Descendre ${esc(s.title)}">${icon('down', 'sm')}</button>
            <button class="iconbtn plain sm" data-act="pl-remove" data-id="${p.id}" data-song="${s.id}" aria-label="Retirer ${esc(s.title)} de la playlist">${icon('close', 'sm')}</button>
          </span></li>`).join('')}</ol>` : '<p class="muted" style="font-size:14px">Playlist vide. Ouvrez une chanson et utilisez « Ajouter à une playlist ».</p>') : ''}
    </article>`;
  }).join('');
}

