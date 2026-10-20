/* Harmonia — interface : progression (statistiques, exercices, titres conseillés, métronome) */
'use strict';

const fmtDur = (s) => { const m = Math.round(s / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
const DAY_NAMES = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

function niceMax(v) { for (const n of [10, 20, 30, 40, 60, 80, 120, 180, 240, 360]) if (v <= n) return n; return Math.ceil(v / 120) * 120; }
/** Minutes jouées par jour (14 derniers jours) : barres fines à l'échelle, valeurs au survol et au focus. */
function practiceChartSVG(days) {
  const W = 700, H = 244, L = 46, R = 10, T = 30, B = 34;
  const mins = days.map((d) => d.seconds / 60);
  const max = niceMax(Math.max(5, ...mins));
  const pw = W - L - R, ph = H - T - B, slot = pw / days.length, bw = Math.min(26, slot - 8);
  const y = (v) => T + ph - (v / max) * ph;
  let s = `<svg class="pchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Minutes de pratique par jour, 14 derniers jours">`;
  for (const v of [0, max / 2, max]) s += `<line class="pc-grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="pc-lbl" x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${fmtNum(v, 0)}</text>`;
  s += `<text class="pc-lbl" x="${L - 8}" y="12" text-anchor="end">min</text>`;
  days.forEach((d, i) => {
    const v = mins[i], cx = L + slot * i + slot / 2, x = cx - bw / 2;
    const date = new Date(d.start), today = i === days.length - 1;
    const label = today ? 'auj.' : DAY_NAMES[date.getDay()];
    const full = `${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} : ${v ? fmtDur(d.seconds) : 'pas de pratique'}`;
    if (v > 0) {
      const h = Math.max(3, (v / max) * ph), top = T + ph - h, r = Math.min(4, bw / 2, h);
      s += `<path class="pc-bar${today ? ' today' : ''}" d="M${x} ${T + ph}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + bw - r}Q${x + bw} ${top} ${x + bw} ${top + r}V${T + ph}Z"/>`;
    }
    s += `<rect class="pc-hit" x="${(L + slot * i).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${ph + B}" tabindex="0" data-tip="${esc(full)}" aria-label="${esc(full)}"><title>${esc(full)}</title></rect>`;
    s += `<text class="pc-lbl${today ? ' strong' : ''}" x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle">${label}</text>`;
  });
  s += `<line class="pc-axis" x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}"/>`;
  return s + '</svg>';
}

function viewProgress() {
  const st = practiceStats(store.practice.sessions, store.songs);
  const usage = chordUsage(st.top, store.songs);
  const exercises = suggestExercises(st, usage, store.songs);
  const titles = suggestSongs(st, usage, store.songs);
  const topChords = [...usage.chords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const tile = (label, value, sub) => `<div class="kpi"><span class="kpi-l">${label}</span><strong class="kpi-v num">${value}</strong><span class="kpi-s">${sub}</span></div>`;
  return `<div class="view">
    <header class="page-head"><h1>Ma progression</h1><p>Calculée sur cet appareil à partir des chansons que vous ouvrez (une séance compte à partir de 30 secondes d’activité). Les suggestions suivent des règles simples, expliquées à chaque fois. Rien n’est envoyé.</p></header>
    ${!S().trackPractice ? `<div class="notice warn">${icon('info')}<p>Le suivi de la pratique est désactivé dans les réglages : aucune nouvelle séance n’est comptée.</p><button class="btn btn-soft sm" data-act="track-on">Réactiver le suivi</button></div>` : ''}
    <div class="kpis">
      ${tile('Cette semaine', st.week.seconds ? fmtDur(st.week.seconds) : '0 min', `${st.week.sessions} séance${st.week.sessions > 1 ? 's' : ''} · ${st.week.songs} chanson${st.week.songs > 1 ? 's' : ''}`)}
      ${tile('Série en cours', `${st.streak} jour${st.streak > 1 ? 's' : ''}`, st.streak ? 'jours consécutifs de pratique' : 'jouez aujourd’hui pour la commencer')}
      ${tile('Depuis le début', fmtDur(st.totalSeconds), `${st.sessions} séance${st.sessions > 1 ? 's' : ''}`)}
      ${tile('Répertoire joué', String(st.songsPlayed), `chanson${st.songsPlayed > 1 ? 's' : ''} sur ${store.songs.length}`)}
    </div>
    <section class="card stack" aria-labelledby="h-chart">
      <div class="section-head"><h2 id="h-chart">Temps de pratique, 14 derniers jours</h2></div>
      ${st.sessions ? `<div class="pchart-wrap">${practiceChartSVG(st.days)}<div class="pc-tip" id="pc-tip" hidden></div></div>
      <details class="help"><summary>Voir les données sous forme de tableau</summary><table class="data-table"><thead><tr><th>Jour</th><th>Temps</th></tr></thead><tbody>${st.days.map((d) => `<tr><td>${esc(new Date(d.start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</td><td class="num">${d.seconds ? fmtDur(d.seconds) : '—'}</td></tr>`).join('')}</tbody></table></details>`
      : `<div class="empty"><p>Aucune séance pour l’instant. Ouvrez une chanson et jouez au moins 30 secondes : votre temps de pratique apparaîtra ici.</p></div>`}
    </section>
    <section class="stack" aria-labelledby="h-top">
      <h2 id="h-top">Vos chansons les plus jouées</h2>
      ${st.top.length ? `<ol class="toplist">${st.top.slice(0, 6).map((e) => `<li><button class="song-main" data-act="open" data-id="${e.song.id}"><span class="song-title">${esc(e.song.title)}</span><span class="song-sub">${esc(e.song.artist || '')}</span></button>
        <span class="num tl-c"><strong>${e.count}</strong> séance${e.count > 1 ? 's' : ''}</span><span class="num tl-t">${fmtDur(e.seconds)}</span><span class="tl-d">${esc(relDay(e.last))}</span></li>`).join('')}</ol>` : '<p class="muted">Les chansons que vous jouez le plus s’afficheront ici.</p>'}
      ${topChords.length ? `<p class="help">Accords que vous jouez le plus : ${topChords.map(([c]) => `<button class="chip" data-act="chord" data-chord="${esc(c)}">${esc(c)}</button>`).join(' ')}</p>` : ''}
    </section>
    <section class="stack" aria-labelledby="h-ex">
      <h2 id="h-ex">Exercices proposés</h2>
      <div class="exgrid">${exercises.map(exerciseCard).join('')}</div>
    </section>
    <section class="stack" aria-labelledby="h-titles">
      <div class="section-head"><h2 id="h-titles">Titres pour progresser</h2></div>
      <ul class="songlist">${titles.map(titleRow).join('') || '<li class="muted">Ajoutez des chansons à votre bibliothèque pour recevoir des suggestions.</li>'}</ul>
    </section>
    <section class="card stack" aria-labelledby="h-metro" id="metronome">
      <h2 id="h-metro">Métronome</h2>
      ${metronomeHTML()}
    </section>
  </div>`;
}
function relDay(t) {
  const d = Math.floor((startOfDay(Date.now()) - startOfDay(t)) / DAY_MS);
  return d <= 0 ? 'aujourd’hui' : d === 1 ? 'hier' : `il y a ${d} jours`;
}
function exerciseCard(ex) {
  const btn = ex.kind === 'changes' ? `<button class="btn btn-primary sm" data-act="ex-changes" data-a="${esc(ex.a)}" data-b="${esc(ex.b)}" data-key="${esc(ex.key)}">${icon('timer', 'sm')}Commencer</button>`
    : ex.kind === 'chords' ? `<div class="row" style="gap:6px">${ex.chords.map((c) => `<button class="chip" data-act="chord" data-chord="${esc(c)}">${esc(c)}</button>`).join('')}</div>`
      : ex.kind === 'rhythm' ? `<button class="btn btn-soft sm" data-act="ex-rhythm">${icon('play', 'sm')}Ouvrir le métronome</button>`
        : `<button class="btn btn-soft sm" data-act="ex-song" data-cid="${esc(ex.catalogId)}">${icon('play', 'sm')}Jouer la chanson</button>`;
  return `<article class="excard"><h3>${esc(ex.title)}</h3><p>${esc(ex.reason)}</p>${btn}</article>`;
}
function titleRow(t) {
  const own = t.catalog ? catalogOwned(t.ref) : t.ref;
  const p = parseChord((t.ref.key || ''));
  return `<li class="song-row">
    <span class="key-tab ${p ? 'c' + (pcOf(p.root) % 5) : 'c0'}" aria-hidden="true">${esc(t.ref.key || '♪')}</span>
    <div class="song-main" style="cursor:default"><span class="song-title">${esc(t.title)}</span><span class="song-sub">${esc(t.reason)}</span></div>
    <span class="song-actions">${own ? `<button class="btn btn-ghost sm" data-act="open" data-id="${own.id}">${icon('play', 'sm')}<span class="lbl">${t.revisit ? 'Rejouer' : 'Ouvrir'}</span></button>` : `<button class="btn btn-soft sm" data-act="cat-add" data-id="${t.ref.id}">${icon('plus', 'sm')}<span class="lbl">Ajouter</span></button>`}</span>
  </li>`;
}
const STRUM_PATTERNS = [
  ['Débutant', '↓ · ↓ · ↓ · ↓ ·', 'Un coup vers le bas par temps.'],
  ['Balade', '↓ · ↓ ↑ · ↑ ↓ ↑', 'Le grand classique folk : bas, bas-haut, haut-bas-haut.'],
  ['Valse (3 temps)', '↓ · ↓ ↑ ↓ ↑', 'Pour Amazing Grace, Greensleeves, Clementine.']
];
function metronomeHTML() {
  return `<div class="metro">
    <div class="metro-beats" id="metro-beats" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<span data-b="${i}"></span>`).join('')}</div>
    <div class="row">
      <button class="iconbtn" data-act="metro-bpm" data-d="-5" aria-label="Ralentir de 5">${icon('minus', 'sm')}</button>
      <label for="metro-bpm" class="sr-only">Tempo en battements par minute</label>
      <input id="metro-bpm" type="range" min="30" max="220" step="1" value="${metro.bpm}">
      <button class="iconbtn" data-act="metro-bpm" data-d="5" aria-label="Accélérer de 5">${icon('plus', 'sm')}</button>
      <output id="metro-out" class="num">${metro.bpm} BPM</output>
      <button class="btn btn-primary" data-act="metro-toggle" id="metro-toggle">${metro.on ? icon('stop', 'sm') + 'Arrêter' : icon('play', 'sm') + 'Démarrer'}</button>
    </div>
    <div class="row" role="group" aria-label="Mesure"><span class="label">Mesure :</span>
      ${[2, 3, 4, 6].map((n) => `<button class="btn btn-ghost sm" data-act="metro-beats" data-n="${n}" aria-pressed="${metro.beats === n}">${n} temps</button>`).join('')}</div>
    <ul class="strums">${STRUM_PATTERNS.map(([n, p, d]) => `<li><strong>${n}</strong><code>${p}</code><span>${d}</span></li>`).join('')}</ul>
    <p class="help">↓ coup vers le bas, ↑ vers le haut, · temps sans gratter (la main continue son mouvement). Commencez lentement, puis augmentez de 5 BPM quand le geste est régulier.</p>
  </div>`;
}
function afterProgress() {
  const r = $('#metro-bpm');
  if (r) r.addEventListener('input', () => { metro.bpm = Number(r.value); $('#metro-out').textContent = metro.bpm + ' BPM'; });
  metro.onBeat = (b) => { $$('#metro-beats span').forEach((el, i) => el.classList.toggle('on', i === b)); };
  const nb = $('#metro-beats'); if (nb) nb.innerHTML = Array.from({ length: metro.beats }, (_, i) => `<span data-b="${i}"></span>`).join('');
  const wrap = $('.pchart-wrap'), tip = $('#pc-tip');
  if (wrap && tip) {
    const show = (el) => { const r0 = wrap.getBoundingClientRect(), b = el.getBoundingClientRect(); tip.textContent = el.dataset.tip; tip.hidden = false; tip.style.left = Math.min(r0.width - 180, Math.max(0, b.left - r0.left + b.width / 2 - 90)) + 'px'; tip.style.top = '0px'; };
    $$('.pc-hit', wrap).forEach((el) => { el.addEventListener('mouseenter', () => show(el)); el.addEventListener('focus', () => show(el)); el.addEventListener('mouseleave', () => { tip.hidden = true; }); el.addEventListener('blur', () => { tip.hidden = true; }); });
  }
}

/* ---------- Exercice : changements d'accords en une minute ---------- */
const chg = { left: 60, count: 0, timer: 0, key: '', a: '', b: '', running: false, urls: [] };
function chordMiniHTML(name) {
  const key = instKey(), r = chordShapes(name, key);
  if (!r.ok) return `<div class="notice warn"><p>${esc(r.reason)}</p></div>`;
  if (r.piano) return pianoSVG(r.chord);
  const v = r.list[0];
  return key === 'guitare' && !r.computed ? diagramSVG(v) : fretDiagramSVG(v, instStrings(key));
}
function openChangesExercise(a, b, key) {
  stopChangeTimer();
  Object.assign(chg, { left: 60, count: 0, key, a, b, running: false });
  const prev = store.practice.exercises[key];
  const micOk = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  openModal(`<div class="mdl">
    <div class="mdl-head"><div><h2>Changements ${esc(a)} ↔ ${esc(b)}</h2><p class="muted" style="font-size:14px">Passez d’un accord à l’autre le plus de fois possible en 60 secondes, en ne comptant que les changements propres. ${curInst().name}.</p></div>
      <button class="iconbtn sm" data-act="modal-close" aria-label="Fermer">${icon('close', 'sm')}</button></div>
    <div class="chg-chords">${[a, b].map((c, i) => `<figure id="chg-f${i}"><figcaption>${esc(c)} <button class="iconbtn sm" data-act="play-chord" data-chord="${esc(c)}" aria-label="Écouter ${esc(c)}" title="Écouter">${icon('speaker', 'sm')}</button></figcaption>${chordMiniHTML(c)}</figure>`).join('')}</div>
    <div class="row chg-listen"><button class="btn btn-soft sm" data-act="chg-model" id="chg-model" aria-pressed="false">${icon('speaker', 'sm')}Écouter le modèle</button><span class="help">L’enchaînement joué au tempo du métronome (${metro.bpm} BPM, 4 temps par accord), pour savoir quel son viser.</span></div>
    <div class="chg-board"><div><span class="kpi-l">Temps</span><strong class="num" id="chg-left">60</strong></div><div><span class="kpi-l">Changements</span><strong class="num" id="chg-count">0</strong></div><div><span class="kpi-l">Record</span><strong class="num" id="chg-best">${prev && prev.best ? prev.best : '—'}</strong></div></div>
    <p class="help num" id="chg-hist">${prev && prev.history && prev.history.length ? `Derniers scores : ${prev.history.slice(-6).join(' · ')}` : ''}</p>
    <div class="chg-opts">
      <label class="check"><input type="checkbox" id="chg-metro"><span>Avec le métronome (${metro.bpm} BPM)</span></label>
      <label class="check"><input type="checkbox" id="chg-mic" ${micOk ? '' : 'disabled'}><span>Compter automatiquement : Harmonia écoute au micro et reconnaît ${esc(a)} et ${esc(b)}</span></label>
      <label class="check"><input type="checkbox" id="chg-rec" checked><span>Enregistrer ma prise pour la réécouter plus tard</span></label>
    </div>
    <div class="ear" id="chg-ear" hidden aria-live="off"><span class="lvl" aria-hidden="true"><i id="chg-lvl"></i></span><span>J’entends : <strong id="chg-heard">…</strong></span></div>
    <p id="chg-msg" class="help" role="status">Touchez « Démarrer », puis « +1 » (ou la touche Espace) à chaque changement réussi${micOk ? ', ou laissez Harmonia compter au micro' : ''}.</p>
    <div class="mdl-foot"><button class="btn btn-ghost" data-act="chg-stop">Arrêter</button><button class="btn btn-soft" data-act="chg-start" id="chg-start">${icon('timer', 'sm')}Démarrer</button><button class="btn btn-primary chg-plus" data-act="chg-plus" id="chg-plus" disabled>+1 changement</button></div>
    <details class="chg-more"><summary>Sans micro : analyser un enregistrement</summary>
      <p class="help">Enregistrez une minute d’exercice avec le dictaphone de votre téléphone (ou tout autre appareil), puis choisissez le fichier : Harmonia y reconnaît ${esc(a)} et ${esc(b)} et compte les changements sur les 60 premières secondes jouées. Le fichier reste sur votre appareil.</p>
      <div class="row"><button class="btn btn-soft sm" data-act="chg-file">${icon('file', 'sm')}Choisir un enregistrement</button><input type="file" id="chg-file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.aac" hidden></div>
    </details>
    <section class="chg-takes"><h3>Mes prises</h3><div id="chg-takes"><p class="help">Chargement…</p></div>
      <p class="help">Réécoutez une prise ancienne puis la dernière : c’est le meilleur moyen d’entendre vos progrès. Les ${TAKES_KEEP} prises les plus récentes de chaque exercice sont gardées sur cet appareil (elles ne font pas partie de la sauvegarde JSON).</p></section>
  </div>`);
  modal.classList.add('wide');
  const fi = $('#chg-file');
  if (fi) fi.addEventListener('change', () => { const f = fi.files && fi.files[0]; fi.value = ''; if (f) analyzeChangesFile(f); });
  refreshTakes();
}
function chgMsg(html, kind = '') { const m = $('#chg-msg'); if (m) { m.innerHTML = html; m.dataset.kind = kind; } }
function bumpCount() {
  if (!chg.running) return;
  chg.count++;
  const c = $('#chg-count'); if (c) { c.textContent = String(chg.count); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
}
function toggleModel() {
  const b = $('#chg-model');
  if (syn.on) { stopLoop(); return; }
  const ok = playLoop([chg.a, chg.b], { bpm: metro.bpm, beats: 4, onStep: (i) => {
    $$('.chg-chords figure').forEach((f, k) => f.classList.toggle('playing', k === i));
    if (i < 0 && b) { b.setAttribute('aria-pressed', 'false'); b.innerHTML = icon('speaker', 'sm') + 'Écouter le modèle'; }
  } });
  if (ok && b) { b.setAttribute('aria-pressed', 'true'); b.innerHTML = icon('stop', 'sm') + 'Arrêter l’écoute'; }
}
async function startChangeTimer() {
  if (chg.running) return;
  stopLoop();
  const useMic = $('#chg-mic') && $('#chg-mic').checked;
  const startBtn = $('#chg-start');
  if (useMic) {
    if (startBtn) startBtn.disabled = true;
    chgMsg('Autorisez l’accès au micro dans la fenêtre de votre navigateur…');
    try {
      await earStart(chg.a, chg.b, {
        record: $('#chg-rec') && $('#chg-rec').checked,
        onFrame: (name, level, near) => {
          const h = $('#chg-heard'), l = $('#chg-lvl');
          if (l) l.style.width = Math.round(level * 100) + '%';
          if (h) { h.textContent = name || (level > 0.08 ? (near ? `pas encore net (plutôt ${near} ?)` : 'accord non reconnu') : 'silence'); h.dataset.ok = name ? '1' : ''; }
          $$('.chg-chords figure').forEach((f, k) => f.classList.toggle('heard', !!name && [chg.a, chg.b][k] === name));
        },
        onChange: () => bumpCount()
      });
    } catch (e) {
      if (startBtn) startBtn.disabled = false;
      chgMsg(esc(e.message), 'err');
      return;
    }
    if (!$('#chg-start')) { earStop(); return; } // fenêtre fermée pendant l'autorisation
    $('#chg-ear').hidden = false;
  }
  Object.assign(chg, { left: 60, count: 0, running: true });
  $('#chg-count').textContent = '0'; $('#chg-left').textContent = '60';
  $('#chg-plus').disabled = false; $('#chg-start').disabled = true; $('#chg-plus').focus();
  if ($('#chg-metro') && $('#chg-metro').checked) metroStart(metro.bpm);
  chgMsg(useMic ? 'C’est parti ! Harmonia compte chaque changement entendu ; « +1 » reste disponible si un changement lui échappe.' : 'C’est parti !');
  chg.timer = setInterval(() => {
    chg.left--;
    const el = $('#chg-left'); if (el) el.textContent = String(chg.left);
    if (chg.left <= 0) finishChangeTimer();
  }, 1000);
}
function stopChangeTimer() { clearInterval(chg.timer); chg.running = false; earStop(); if (metro.on && !$('#metronome')) metroStop(); }
/** Enregistre un score (record, historique). */
function recordChangeScore(count) {
  const ex = store.practice.exercises[chg.key] || { best: 0, last: 0, count: 0, history: [] };
  const record = count > ex.best;
  ex.best = Math.max(ex.best, count); ex.last = count; ex.count++; ex.at = Date.now();
  ex.history = (ex.history || []).concat(count).slice(-12);
  store.practice.exercises[chg.key] = ex;
  const b = $('#chg-best'); if (b) b.textContent = String(ex.best);
  const h = $('#chg-hist'); if (h) h.textContent = `Derniers scores : ${ex.history.slice(-6).join(' · ')}`;
  return { record, ex };
}
async function finishChangeTimer() {
  const keep = $('#chg-rec') && $('#chg-rec').checked;
  const takeP = earStop(keep);
  clearInterval(chg.timer); chg.running = false; metroStop();
  const count = chg.count, key = chg.key;
  const { record, ex } = recordChangeScore(count);
  chgMsg(`${count} changement${count > 1 ? 's' : ''} en une minute.${record ? ' Nouveau record !' : ` Record : ${ex.best}.`} Recommencez demain pour mesurer vos progrès.`, 'ok');
  const p = $('#chg-plus'); if (p) p.disabled = true;
  const s = $('#chg-start'); if (s) s.disabled = false;
  const e = $('#chg-ear'); if (e) e.hidden = true;
  $$('.chg-chords figure').forEach((f) => f.classList.remove('heard'));
  commit(record ? 'Nouveau record enregistré' : 'Score enregistré', record ? 'ok' : '');
  const take = await takeP;
  if (take) {
    try { await takeSave(key, take.blob, { score: count, seconds: take.seconds, source: 'micro' }); refreshTakes(); }
    catch (err) { toast('La prise n’a pas pu être enregistrée sur l’appareil (' + (err.message || 'stockage refusé') + '). Votre score, lui, est enregistré.', 'err'); }
  }
}
async function analyzeChangesFile(file) {
  if (chg.running) return;
  stopLoop();
  chgMsg('Lecture de l’enregistrement…');
  try {
    const { samples, sr } = await decodeAudioFile(file);
    chgMsg('Analyse des accords…');
    await new Promise((r) => setTimeout(r, 30));
    const r = analyzeTake(samples, sr, chg.a, chg.b);
    if (r.recognized < 8) { chgMsg(`Ni ${esc(chg.a)} ni ${esc(chg.b)} n’ont été reconnus dans cet enregistrement. Vérifiez l’accordage, rapprochez le téléphone de l’instrument et laissez sonner chaque accord au moins une demi-seconde. Aucun score n’a été enregistré.`, 'err'); return; }
    const { record, ex } = recordChangeScore(r.changes);
    const played = Math.min(60, r.durationS - r.startS);
    chgMsg(`${r.changes} changement${r.changes > 1 ? 's' : ''} entendu${r.changes > 1 ? 's' : ''}${played < 59 ? ` en ${fmtNum(played, 0)} secondes (enregistrement plus court qu’une minute)` : ' en une minute'}.${record ? ' Nouveau record !' : ` Record : ${ex.best}.`} La reconnaissance peut manquer un changement trop bref : le résultat est indicatif.`, 'ok');
    $('#chg-count').textContent = String(r.changes);
    commit(record ? 'Nouveau record enregistré' : 'Score enregistré', record ? 'ok' : '');
    if (file.size <= 15 * 1024 * 1024) {
      try { await takeSave(chg.key, file, { score: r.changes, seconds: Math.round(r.durationS), source: 'fichier' }); refreshTakes(); }
      catch (err) { toast('L’enregistrement n’a pas pu être gardé sur l’appareil. Le score est enregistré.', 'err'); }
    }
  } catch (e) { chgMsg(esc(e.message || 'Analyse impossible.'), 'err'); }
}
async function refreshTakes() {
  const box = $('#chg-takes'); if (!box) return;
  chg.urls.forEach((u) => URL.revokeObjectURL(u)); chg.urls = [];
  let list;
  try { list = await takesList(chg.key); } catch (e) { box.innerHTML = '<p class="help">Les prises ne peuvent pas être gardées dans ce navigateur (stockage indisponible).</p>'; return; }
  if (!$('#chg-takes')) return;
  if (!list.length) { box.innerHTML = '<p class="help">Aucune prise pour l’instant. Cochez « Enregistrer ma prise » et utilisez le micro, ou analysez un enregistrement.</p>'; return; }
  box.innerHTML = `<ul class="takes">${list.map((t, i) => {
    const u = URL.createObjectURL(t.blob); chg.urls.push(u);
    const d = new Date(t.at);
    return `<li><div class="take-h"><strong>${esc(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }))} · ${esc(d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))}</strong>
      <span class="num">${t.score} changement${t.score > 1 ? 's' : ''}</span>${i === list.length - 1 && list.length > 1 ? '<span class="tag">la plus ancienne</span>' : i === 0 ? '<span class="tag">la plus récente</span>' : ''}
      <button class="iconbtn sm" data-act="take-del" data-id="${esc(t.id)}" aria-label="Supprimer cette prise">${icon('trash', 'sm')}</button></div>
      <audio controls preload="metadata" src="${u}"></audio></li>`;
  }).join('')}</ul>`;
}
function onExerciseModalClosed() {
  stopLoop();
  if (chg.running) { clearInterval(chg.timer); chg.running = false; metroStop(); }
  earStop();
  chg.urls.forEach((u) => URL.revokeObjectURL(u)); chg.urls = [];
}
