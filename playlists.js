/* Harmonia — interface : playlists et fenêtres de dialogue */
'use strict';
/* ===================================================================
   Playlists
   =================================================================== */
function createPlaylist(name) {
  const n = name.trim();
  if (!n) return null;
  if (store.playlists.some((p) => norm(p.name) === norm(n))) { toast('Une playlist porte déjà ce nom.', 'err'); return null; }
  const p = { id: uid(), name: n, songIds: [], createdAt: Date.now() };
  store.playlists.push(p);
  return p;
}
function openPlaylistPicker(id) {
  const s = songById(id || ui.songId);
  if (!s) return;
  const list = () => store.playlists.length ? `<ul class="pick-list">${store.playlists.map((p) => `<li><label><input type="checkbox" data-pl="${p.id}" ${p.songIds.includes(s.id) ? 'checked' : ''}><span>${esc(p.name)}</span><span class="muted num" style="margin-left:auto;font-size:13px">${p.songIds.length}</span></label></li>`).join('')}</ul>` : '<p class="muted">Vous n’avez pas encore de playlist. Créez-en une ci-dessous.</p>';
  openModal(`<div class="mdl">
    <div class="mdl-head"><div><h2>Ranger la partition</h2><p class="muted" style="font-size:14px">${esc(s.title)}</p></div><button class="iconbtn sm" data-act="modal-close" aria-label="Fermer">${icon('close', 'sm')}</button></div>
    <p class="muted" style="font-size:14px">Cochez les playlists où ranger cette partition. Elle reste aussi dans votre bibliothèque.</p>
    <div id="pick-wrap">${list()}</div>
    <label class="check"><input type="checkbox" id="pick-fav" ${s.fav ? 'checked' : ''}><span class="label">Garder en favori</span></label>
    <form class="row" id="pick-new" style="flex-wrap:nowrap"><label class="sr-only" for="pick-name">Nouvelle playlist</label><input id="pick-name" class="input" placeholder="Nouvelle playlist" maxlength="60"><button class="btn btn-soft" type="submit">Créer</button></form>
    <div class="mdl-foot"><button class="btn btn-primary" data-act="modal-close">Terminé</button></div>
  </div>`);
  const wire = () => $$('#pick-wrap input[type="checkbox"]').forEach((cb) => cb.addEventListener('change', () => {
    const p = store.playlists.find((x) => x.id === cb.dataset.pl);
    if (cb.checked) { if (!p.songIds.includes(s.id)) p.songIds.push(s.id); }
    else p.songIds = p.songIds.filter((x) => x !== s.id);
    commit(cb.checked ? `Ajoutée à « ${p.name} »` : `Retirée de « ${p.name} »`, '');
  }));
  wire();
  modal.dataset.refresh = '1';
  $('#pick-fav').addEventListener('change', (e) => { s.fav = e.target.checked; commit(s.fav ? 'Ajoutée aux favoris' : 'Retirée des favoris', ''); });
  $('#pick-new').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = createPlaylist($('#pick-name').value);
    if (p) { p.songIds.push(s.id); $('#pick-wrap').innerHTML = list(); wire(); $('#pick-name').value = ''; commit(`Ajoutée à « ${p.name} »`); }
  });
}
function askText(title, label, value, okLabel, cb) {
  openModal(`<form class="mdl" id="ask-form">
    <div class="mdl-head"><h2>${esc(title)}</h2><button type="button" class="iconbtn sm" data-act="modal-close" aria-label="Fermer">${icon('close', 'sm')}</button></div>
    <div class="field"><label for="ask-in">${esc(label)}</label><input id="ask-in" class="input" value="${esc(value)}" maxlength="60" required></div>
    <div class="mdl-foot"><button type="button" class="btn btn-ghost" data-act="modal-close">Annuler</button><button class="btn btn-primary" type="submit">${esc(okLabel)}</button></div>
  </form>`);
  const i = $('#ask-in'); i.focus(); i.select();
  $('#ask-form').addEventListener('submit', (e) => { e.preventDefault(); if (i.value.trim()) { cb(i.value.trim()); closeModal(); } });
}
function askConfirm(title, text, okLabel, cb, danger = true) {
  openModal(`<div class="mdl">
    <div class="mdl-head"><h2>${esc(title)}</h2><button class="iconbtn sm" data-act="modal-close" aria-label="Fermer">${icon('close', 'sm')}</button></div>
    <p>${text}</p>
    <div class="mdl-foot"><button class="btn btn-ghost" data-act="modal-close">Annuler</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cf-ok">${esc(okLabel)}</button></div>
  </div>`);
  $('#cf-ok').onclick = () => { closeModal(); cb(); };
  $('#cf-ok').focus();
}

