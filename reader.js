/* Harmonia — interface : lecture, défilement, diagrammes */
'use strict';
/* ===================================================================
   Lecture d'une chanson
   =================================================================== */
function currentSong() { return songById(ui.songId); }
function songCtx(song) {
  const info = songInfo(song);
  const origKey = song.key || info.list[0] || '';
  return transposeContext(origKey, song.transpose || 0, S().accidentals);
}
function viewSong() {
  const s = currentSong();
  if (!s) return `<div class="view"><div class="empty"><p>Cette chanson n’existe plus.</p><button class="btn btn-primary" data-act="nav" data-view="library">Retour à la bibliothèque</button></div></div>`;
  const info = songInfo(s);
  const ctx = songCtx(s);
  const n = s.transpose || 0;
  const keyOut = s.key ? `${esc(ctx.keyName)}<small>${n ? (n > 0 ? '+' : '−') + Math.abs(n) + ' demi-ton' + (Math.abs(n) > 1 ? 's' : '') : 'd’origine'}</small>`
    : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}<small>demi-tons</small>`;
  const hasTabs = info.tabs;
  return `<article class="reader view ${S().showTabs ? '' : 'hide-tabs'} ${ui.focus ? 'focus-mode' : ''}" id="reader" style="--scale:${S().textScale};--tabzoom:${ui.tabZoom}">
    <div class="rd-mini" id="rd-mini" inert>
      <div class="rd-mini-in">
        <button class="iconbtn sm" data-act="back" aria-label="Retour">${icon('back', 'sm')}</button>
        <p class="rd-mini-title">${esc(s.title)}</p>
        <div class="tool-group" role="group" aria-label="Transposition">
          <button class="tg" data-act="tp" data-d="-1" aria-label="Baisser d’un demi-ton">−</button>
          <output id="tp-mini" class="num">${s.key ? esc(ctx.keyName) : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n)}</output>
          <button class="tg" data-act="tp" data-d="1" aria-label="Monter d’un demi-ton">+</button>
        </div>
        <button class="iconbtn sm fav-btn" data-act="fav" data-id="${s.id}" aria-pressed="${s.fav}" aria-label="${s.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${icon('heart', 'sm')}</button>
      </div>
    </div>
    <header class="rd-head" id="rd-head">
      <div class="rd-top">
        <button class="iconbtn" data-act="back" aria-label="Retour">${icon('back')}</button>
        <div class="rd-title"><h1>${esc(s.title)}</h1><p class="artist">${esc(s.artist || 'Artiste non renseigné')}</p></div>
        <div class="rd-actions">
          <button class="iconbtn fav-btn" data-act="fav" data-id="${s.id}" aria-pressed="${s.fav}" aria-label="${s.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${icon('heart')}</button>
          <button class="iconbtn" data-act="pl-pick" aria-label="Ranger dans une playlist" title="Ranger dans une playlist">${icon('listplus')}</button>
          <button class="iconbtn" data-act="menu" aria-label="Plus d’actions" aria-expanded="${ui.menuOpen}" aria-haspopup="true">${icon('more')}</button>
          ${ui.menuOpen ? `<div class="menu" role="menu">
            <button role="menuitem" data-act="edit" data-id="${s.id}">${icon('edit', 'sm')}Modifier la fiche</button>
            <button role="menuitem" data-act="dup">${icon('copy', 'sm')}Dupliquer</button>
            <button role="menuitem" data-act="exp-cho">${icon('export', 'sm')}Exporter en ChordPro</button>
            <button role="menuitem" data-act="exp-json">${icon('export', 'sm')}Exporter en JSON</button>
            <hr><button role="menuitem" class="danger" data-act="del-song">${icon('trash', 'sm')}Supprimer la chanson</button></div>` : ''}
        </div>
      </div>
      <div class="rd-meta">
        ${s.key ? `<span class="chip">Tonalité d’origine : ${esc(s.key)}</span>` : ''}
        ${s.capo ? `<span class="chip peach">Capo ${esc(s.capo)}</span>` : ''}
        ${s.difficulty ? `<span class="chip sage">${esc(s.difficulty)}</span>` : ''}
        ${s.structure ? `<span class="chip outline">${esc(s.structure)}</span>` : ''}
        ${s.source === 'catalog' || s.source === 'example' ? '<span class="chip blue">Domaine public</span>' : ''}
      </div>
      ${s.capo && (instKey() === 'piano' || instKey() === 'basse') ? `<div class="notice">${icon('info')}<p>Cette fiche est écrite pour une guitare avec capo en case ${esc(s.capo)} : les accords sonnent ${esc(s.capo)} demi-ton${Number(s.capo) > 1 ? 's' : ''} plus haut qu’écrit. ${(s.transpose || 0) === Number(s.capo) ? 'La transposition en son réel est appliquée.' : `Pour jouer dans la même tonalité au ${esc(curInst().name.toLowerCase())}, transposez de +${esc(s.capo)}.`}</p>${(s.transpose || 0) === Number(s.capo) ? '' : `<button class="btn btn-soft sm" data-act="capo-real">Transposer de +${esc(s.capo)}</button>`}</div>` : ''}
      <div class="rd-tools">
        ${instrumentPicker('rd-inst')}
        <div class="tool-group" role="group" aria-label="Transposition">
          <span class="tg-label">Ton</span>
          <button class="tg" data-act="tp" data-d="-1" aria-label="Baisser d’un demi-ton">−</button>
          <output id="tp-out" aria-live="polite">${keyOut}</output>
          <button class="tg" data-act="tp" data-d="1" aria-label="Monter d’un demi-ton">+</button>
          <button class="reset" data-act="tp-reset" ${n ? '' : 'disabled'}>Réinitialiser</button>
        </div>
        <div class="tool-group" role="group" aria-label="Taille du texte">
          <span class="tg-label">Texte</span>
          <button class="tg" data-act="size" data-d="-1" aria-label="Réduire le texte">${icon('minus', 'sm')}</button>
          <output id="size-out" class="num">${Math.round(S().textScale * 100)} %</output>
          <button class="tg" data-act="size" data-d="1" aria-label="Agrandir le texte">${icon('plus', 'sm')}</button>
        </div>
        ${hasTabs ? `<button class="tog" data-act="tabs" aria-pressed="${S().showTabs}">${S().showTabs ? 'Masquer' : 'Afficher'} la tablature</button>
          <div class="tool-group" role="group" aria-label="Zoom de la tablature"><span class="tg-label keep">Tab</span>
          <button class="tg" data-act="tabzoom" data-d="-1" aria-label="Réduire la tablature">${icon('minus', 'sm')}</button>
          <button class="tg" data-act="tabzoom" data-d="1" aria-label="Agrandir la tablature">${icon('plus', 'sm')}</button></div>` : ''}
        <button class="tog" data-act="focus" aria-pressed="${ui.focus}">${icon('focus', 'sm')}Lecture seule</button>
      </div>
    </header>
    <div class="rd-body" id="rd-body">${s.body.trim() ? renderSongBody(s.body, n, ctx.flats, true, instKey()) : '<div class="empty"><p>Cette fiche ne contient pas encore de paroles ni d’accords.</p></div>'}
      ${s.tab && s.tab.trim() ? `<div class="tab-extra"><h3 class="sec-label">Tablature</h3>${renderTab(s.tab.split('\n'), instKey())}</div>` : ''}
    </div>
    ${s.notes && s.notes.trim() ? `<details class="notes-box"><summary>Notes personnelles</summary><p>${esc(s.notes)}</p></details>` : ''}
    <div class="scrollbar" role="group" aria-label="Défilement automatique">
      <button class="play" data-act="sc-play" id="sc-play" aria-label="Lancer le défilement">${icon('play', 'lg')}</button>
      <button class="iconbtn" data-act="sc-top" aria-label="Retour au début">${icon('rewind')}</button>
      <button class="iconbtn" data-act="sc-stop" aria-label="Arrêter le défilement">${icon('stop')}</button>
      <div class="speed">
        <button class="iconbtn sm" data-act="sc-speed" data-d="-1" aria-label="Ralentir">${icon('minus', 'sm')}</button>
        <label for="sc-range" class="sr-only">Vitesse de défilement</label>
        <input id="sc-range" type="range" min="0.25" max="3" step="0.05" value="${S().scrollSpeed}">
        <button class="iconbtn sm" data-act="sc-speed" data-d="1" aria-label="Accélérer">${icon('plus', 'sm')}</button>
        <output id="sc-out" aria-live="off">×${fmtNum(S().scrollSpeed)}</output>
      </div>
      <span class="state" id="sc-state" aria-live="polite">À l’arrêt</span>
    </div>
    <p class="kbd-hint">Raccourcis : <kbd>Espace</kbd> lecture ou pause · <kbd>←</kbd> <kbd>→</kbd> vitesse · <kbd>Échap</kbd> fermer le diagramme. Le défilement suit une vitesse réglée à la main : il n’écoute pas votre jeu.</p>
  </article>`;
}
let headObserver = null;
/** Barre compacte : superposée (hauteur nulle dans la page), elle ne décale jamais le texte. */
function watchReaderHead() {
  if (headObserver) headObserver.disconnect();
  const head = $('#rd-head'), mini = $('#rd-mini');
  if (!head || !mini || !('IntersectionObserver' in window)) return;
  headObserver = new IntersectionObserver(([en]) => {
    const show = !en.isIntersecting && en.boundingClientRect.bottom < 0;
    mini.classList.toggle('show', show);
    if (show) mini.removeAttribute('inert'); else mini.setAttribute('inert', '');
  }, { threshold: 0 });
  headObserver.observe(head);
}
function afterSong() {
  watchReaderHead();
  const s = currentSong();
  if (!s) return;
  syncScrollUI();
  // Surligner l'accord ouvert dans le panneau s'il est conservé
  if (cp.open && cp.pinned) { highlightChord(cp.name); }
}
function refreshSongBody() {
  const s = currentSong();
  const ctx = songCtx(s);
  $('#rd-body').innerHTML = (s.body.trim() ? renderSongBody(s.body, s.transpose || 0, ctx.flats, true, instKey()) : '') +
    (s.tab && s.tab.trim() ? `<div class="tab-extra"><h3 class="sec-label">Tablature</h3>${renderTab(s.tab.split('\n'), instKey())}</div>` : '');
}
function openSong(id) {
  const s = songById(id);
  if (!s) { toast('Cette chanson est introuvable : elle a peut-être été supprimée dans un autre onglet.', 'err'); go('library'); return; }
  s.lastOpened = Date.now();
  store.lastSongId = id;
  store.history = [id, ...store.history.filter((x) => x !== id)].slice(0, 40);
  ui.focus = false;
  save();
  go('song', { songId: id });
  practiceStart(id);
}

/* ---------- Défilement automatique ---------- */
const BASE_PX_PER_SEC = 26;
const sc = { playing: false, raf: 0, last: 0, acc: 0, started: false, lock: null };
function scrollStep(ts) {
  if (!sc.playing) return;
  if (!sc.last) sc.last = ts;
  const dt = Math.min(0.1, (ts - sc.last) / 1000);
  sc.last = ts;
  sc.acc += S().scrollSpeed * BASE_PX_PER_SEC * S().textScale * dt;
  const px = Math.floor(sc.acc);
  if (px >= 1) {
    sc.acc -= px;
    const el = document.scrollingElement || document.documentElement;
    const before = el.scrollTop;
    window.scrollBy(0, px);
    if (el.scrollTop === before && before + window.innerHeight >= el.scrollHeight - 2) {
      scrollPause(); setScrollState('Fin du morceau'); return;
    }
  }
  sc.raf = requestAnimationFrame(scrollStep);
}
function scrollPlay() {
  if (sc.playing) return;
  sc.playing = true; sc.started = true; sc.last = 0; sc.acc = 0;
  sc.raf = requestAnimationFrame(scrollStep);
  wakeLock(true);
  syncScrollUI();
}
function scrollPause() { sc.playing = false; cancelAnimationFrame(sc.raf); wakeLock(false); syncScrollUI(); }
function scrollStop() { sc.playing = false; sc.started = false; cancelAnimationFrame(sc.raf); wakeLock(false); syncScrollUI(); }
function setScrollState(t) { const e = $('#sc-state'); if (e) e.textContent = t; }
function syncScrollUI() {
  const b = $('#sc-play');
  if (!b) return;
  b.innerHTML = icon(sc.playing ? 'pause' : 'play', 'lg');
  b.setAttribute('aria-label', sc.playing ? 'Mettre en pause' : sc.started ? 'Reprendre le défilement' : 'Lancer le défilement');
  setScrollState(sc.playing ? 'Défilement' : sc.started ? 'En pause' : 'À l’arrêt');
  const r = $('#sc-range'); if (r) r.value = S().scrollSpeed;
  const o = $('#sc-out'); if (o) o.textContent = '×' + fmtNum(S().scrollSpeed);
}
function setSpeed(v) { S().scrollSpeed = Math.round(clamp(v, 0.25, 3) * 100) / 100; save(); syncScrollUI(); }
async function wakeLock(on) {
  try {
    if (on && 'wakeLock' in navigator && !sc.lock) { sc.lock = await navigator.wakeLock.request('screen'); sc.lock.addEventListener('release', () => { sc.lock = null; }); }
    else if (!on && sc.lock) { await sc.lock.release(); sc.lock = null; }
  } catch (e) { sc.lock = null; }
}

/* ---------- Panneau de diagramme ---------- */
const cp = { open: false, pinned: false, name: '', idx: 0 };
const panel = $('#chord-panel');
let lastChordTrigger = null;
function highlightChord(name) {
  $$('.chord.sel').forEach((b) => b.classList.remove('sel'));
  $$('.chord').forEach((b) => { if (b.dataset.chord === name) b.classList.add('sel'); });
}
function openChordPanel(name, trigger) {
  if (cp.name !== name) cp.idx = 0;
  cp.name = name; cp.open = true;
  if (trigger) lastChordTrigger = trigger;
  renderChordPanel();
  panel.hidden = false;
  highlightChord(name);
  if (trigger) $('#cp-close')?.focus({ preventScroll: true });
}
function renderChordPanel() {
  const key = instKey(), inst = curInst();
  const r = chordShapes(cp.name, key);
  const full = chordFullName(cp.name);
  let body;
  if (r.ok && r.piano) {
    const c = r.chord, pv = pianoVoicing(c);
    body = `<div class="cp-diagram piano">${pianoSVG(c)}</div>
      <p class="cp-notes">${pv.bass !== null ? `<strong>Main gauche :</strong> ${esc(frName(pv.bass % 12))} · ` : ''}<strong>Main droite :</strong> ${pv.notes.map((m) => esc(frName(m % 12))).join(' – ')}</p>
      <p class="cp-legend">Doigté conseillé (main droite) : ${pianoFingering(c)} · 1 pouce, 5 auriculaire. Accord en position fondamentale.</p>`;
  } else if (!r.ok) body = `<div class="notice warn">${icon('info')}<p>${esc(r.reason)} Aucun diagramme n’est affiché plutôt qu’une position inventée.</p></div>`;
  else {
    const v = r.list[clamp(cp.idx, 0, r.list.length - 1)];
    const base = Math.min(...v.frets.filter((f) => f > 0).concat([99]));
    body = `<div class="cp-diagram">${key === 'guitare' && !r.computed ? diagramSVG(v) : fretDiagramSVG(v, instStrings(key))}</div>
      ${r.list.length > 1 ? `<div class="cp-nav">
        <button class="iconbtn sm" data-act="cp-prev" aria-label="Position précédente" ${cp.idx === 0 ? 'disabled' : ''}>${icon('back', 'sm')}</button>
        <span class="num">${v.label} · ${cp.idx + 1} sur ${r.list.length}${base < 99 && base > 1 ? ` · case ${base}` : ''}</span>
        <button class="iconbtn sm" data-act="cp-next" aria-label="Position suivante" ${cp.idx >= r.list.length - 1 ? 'disabled' : ''}>${icon('next', 'sm')}</button></div>`
        : `<div class="cp-nav"><span>${v.label}</span></div>`}
      ${r.bassNote && v.label !== 'Renversement' ? `<div class="notice">${icon('info')}<p>Diagramme de l’accord sans sa basse. Ajoutez la note ${esc(r.bassNote)} (${esc(frNote(r.bassNote))}) à la basse.</p></div>` : ''}
      ${r.computed ? `<p class="cp-legend">Position calculée à partir des notes de l’accord (${esc(inst.name.toLowerCase())}, accordage ${esc(instStrings(key).map((m) => SHARPS[m % 12]).join(' '))}).</p>` : ''}
      <p class="cp-legend">○ corde à vide · × ${inst.arpeggio ? 'corde non utilisée' : 'ne pas jouer'} · 1 index, 2 majeur, 3 annulaire, 4 auriculaire</p>`;
  }
  panel.innerHTML = `<div class="cp-head">
      <div><div class="cp-name" id="cp-name">${esc(cp.name)}</div>${full ? `<div class="cp-full">${esc(full)} · ${esc(inst.name)}</div>` : ''}</div>
      <div class="row" style="gap:6px;flex-wrap:nowrap">
        <button class="iconbtn sm" data-act="cp-play" aria-label="Écouter l’accord" title="Écouter l’accord">${icon('speaker', 'sm')}</button>
        <button class="iconbtn sm" data-act="cp-pin" aria-pressed="${cp.pinned}" aria-label="${cp.pinned ? 'Ne plus garder ouvert' : 'Garder ouvert pendant la lecture'}" title="Garder ouvert">${icon('pin', 'sm')}</button>
        <button class="iconbtn sm" id="cp-close" data-act="cp-close" aria-label="Fermer le diagramme">${icon('close', 'sm')}</button>
      </div>
    </div>${body}
    ${cp.pinned ? '<p class="cp-legend">Panneau conservé : touchez un autre accord pour l’afficher ici.</p>' : ''}`;
  const pinBtn = panel.querySelector('[data-act="cp-pin"]');
  if (pinBtn && cp.pinned) pinBtn.style.background = 'var(--lav)';
}
function closeChordPanel(force) {
  if (!cp.open) return;
  if (cp.pinned && !force) return;
  cp.open = false;
  if (force) cp.pinned = false;
  panel.hidden = true;
  $$('.chord.sel').forEach((b) => b.classList.remove('sel'));
  if (lastChordTrigger && document.body.contains(lastChordTrigger)) lastChordTrigger.focus({ preventScroll: true });
}

