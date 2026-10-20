/* Harmonia — suivi de la pratique (sur l'appareil uniquement), statistiques, exercices et suggestions.
   Les règles sont simples et explicables : rien n'est envoyé, aucune « intelligence » cachée. */
'use strict';

const DAY_MS = 864e5;
const MIN_SESSION_S = 30;      // une séance compte à partir de 30 s d'activité
const IDLE_LIMIT_MS = 5 * 60e3; // au-delà de 5 min sans action (et sans défilement automatique), on cesse de compter
const LEVELS = { 'Débutant': 1, 'Intermédiaire': 2, 'Avancé': 3 };

function cleanPractice(p) {
  const o = { sessions: [], exercises: {} };
  if (!p || typeof p !== 'object') return o;
  if (Array.isArray(p.sessions)) o.sessions = p.sessions.filter((x) => x && typeof x.s === 'string' && Number(x.t) > 0 && Number(x.d) > 0)
    .map((x) => ({ s: x.s.slice(0, 64), t: Number(x.t), d: Math.min(Number(x.d), 6 * 3600) })).slice(-2000);
  if (p.exercises && typeof p.exercises === 'object') for (const [k, v] of Object.entries(p.exercises)) {
    if (!v || typeof v !== 'object') continue;
    o.exercises[String(k).slice(0, 60)] = { best: Number(v.best) || 0, last: Number(v.last) || 0, count: Number(v.count) || 0, at: Number(v.at) || 0, history: Array.isArray(v.history) ? v.history.map(Number).filter((n) => n >= 0).slice(-12) : [] };
  }
  return o;
}

/* ---------- Mesure du temps de jeu ---------- */
const pr = { songId: null, start: 0, active: 0, lastAct: 0, timer: 0 };
function practiceStart(id) {
  practiceStop();
  if (!S().trackPractice) return;
  Object.assign(pr, { songId: id, start: Date.now(), active: 0, lastAct: Date.now() });
  pr.timer = setInterval(() => {
    if (document.visibilityState !== 'visible' || ui.view !== 'song') return;
    if ((typeof sc !== 'undefined' && sc.playing) || Date.now() - pr.lastAct < IDLE_LIMIT_MS) pr.active += 5;
  }, 5000);
}
function practiceActivity() { pr.lastAct = Date.now(); }
function practiceStop() {
  if (!pr.songId) return;
  clearInterval(pr.timer);
  if (pr.active >= MIN_SESSION_S && store.practice && songById(pr.songId)) {
    store.practice.sessions.push({ s: pr.songId, t: pr.start, d: pr.active });
    if (store.practice.sessions.length > 2000) store.practice.sessions.splice(0, store.practice.sessions.length - 2000);
    save();
  }
  pr.songId = null;
}
['pointerdown', 'keydown', 'wheel', 'touchmove'].forEach((ev) => window.addEventListener(ev, () => { if (pr.songId) practiceActivity(); }, { passive: true }));
window.addEventListener('scroll', () => { if (pr.songId) practiceActivity(); }, { passive: true });
window.addEventListener('pagehide', () => { if (pr.songId) { practiceStop(); doWrite().catch(() => {}); } });

/* ---------- Statistiques ---------- */
function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
function practiceStats(sessions, songs, now = Date.now()) {
  const known = new Map(songs.map((s) => [s.id, s]));
  const ss = sessions.filter((x) => known.has(x.s));
  const today = startOfDay(now);
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const a = today - i * DAY_MS, b = a + DAY_MS;
    days.push({ start: a, seconds: ss.filter((x) => x.t >= a && x.t < b).reduce((acc, x) => acc + x.d, 0) });
  }
  const week = ss.filter((x) => x.t >= today - 6 * DAY_MS);
  const activeDays = new Set(ss.map((x) => startOfDay(x.t)));
  let streak = 0;
  for (let d = activeDays.has(today) ? today : today - DAY_MS; activeDays.has(d); d -= DAY_MS) streak++;
  const per = new Map();
  for (const x of ss) {
    const e = per.get(x.s) || { song: known.get(x.s), count: 0, seconds: 0, last: 0 };
    e.count++; e.seconds += x.d; e.last = Math.max(e.last, x.t);
    per.set(x.s, e);
  }
  const top = [...per.values()].sort((a, b) => b.count - a.count || b.seconds - a.seconds);
  return {
    days, top, totalSeconds: ss.reduce((a, x) => a + x.d, 0), sessions: ss.length,
    week: { seconds: week.reduce((a, x) => a + x.d, 0), sessions: week.length, songs: new Set(week.map((x) => x.s)).size },
    streak, songsPlayed: per.size
  };
}
/** Accords et enchaînements des chansons jouées, pondérés par le nombre de séances. */
function chordUsage(top, songs) {
  const chords = new Map(), pairs = new Map(), knownChords = new Set();
  for (const e of top) {
    const seq = [];
    for (const b of parseChordPro(e.song.body).blocks) if (b.type === 'line') for (const sg of b.segs) if (sg.chord && parseChord(sg.chord)) seq.push(sg.chord);
    new Set(seq).forEach((c) => { knownChords.add(c); chords.set(c, (chords.get(c) || 0) + e.count); });
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] === seq[i - 1]) continue;
      const k = [seq[i - 1], seq[i]].sort().join('↔');
      pairs.set(k, (pairs.get(k) || 0) + e.count);
    }
  }
  const libraryChords = new Map();
  for (const s of songs) for (const c of bodyInfo(s.body).list) if (parseChord(c)) { if (!libraryChords.has(c)) libraryChords.set(c, []); libraryChords.get(c).push(s); }
  return { chords, pairs, knownChords, libraryChords };
}
/** Accord de guitare qui ne se joue qu'en barré (aucune position ouverte vérifiée). */
function isBarreChord(c) {
  const r = voicingsFor(c);
  return r.ok && !r.list.some((v) => v.label === 'Position ouverte' || v.label === 'Renversement');
}
function songLevel(s) {
  if (LEVELS[s.difficulty]) return LEVELS[s.difficulty];
  const list = bodyInfo(s.body).list;
  const barres = list.filter((c) => isBarreChord(c)).length;
  return list.length <= 4 && !barres ? 1 : barres > 1 || list.length > 7 ? 3 : 2;
}

/* ---------- Exercices proposés ---------- */
function suggestExercises(stats, usage, songs) {
  const out = [];
  const guitar = instKey() === 'guitare';
  const pairs = [...usage.pairs.entries()].sort((a, b) => b[1] - a[1]);
  for (const [k, w] of pairs.slice(0, 3)) {
    const [a, b] = k.split('↔');
    const ex = store.practice.exercises['chg:' + k];
    out.push({ kind: 'changes', a, b, key: 'chg:' + k, title: `Changements ${a} ↔ ${b} en une minute`,
      reason: `Cet enchaînement revient ${w} fois dans vos séances.${ex && ex.best ? ` Votre record : ${ex.best} changements.` : ''}`, best: ex ? ex.best : 0 });
  }
  if (guitar) {
    const barres = [...usage.libraryChords.entries()].filter(([c]) => isBarreChord(c)).sort((x, y) => y[1].length - x[1].length);
    const notPlayed = barres.filter(([c]) => !usage.knownChords.has(c) || (usage.chords.get(c) || 0) < 3);
    if (notPlayed.length) {
      const [c, list] = notPlayed[0];
      const partner = ['C', 'G', 'Am', 'Em', 'D'].find((x) => usage.knownChords.has(x)) || (c.includes('m') ? 'Am' : 'C');
      out.push({ kind: 'changes', a: partner, b: c, key: `chg:${[partner, c].sort().join('↔')}`, title: `Accord barré : ${c}`,
        reason: `${c} se joue en barré et apparaît dans ${list.length} chanson${list.length > 1 ? 's' : ''} de votre bibliothèque (${list.slice(0, 2).map((s) => s.title).join(', ')}). Alternez-le avec ${partner}, en gardant l’index bien à plat.` });
    }
  }
  const fresh = [...usage.libraryChords.entries()].filter(([c]) => !usage.knownChords.has(c)).sort((x, y) => y[1].length - x[1].length).slice(0, 6);
  if (fresh.length && stats.sessions) out.push({ kind: 'chords', chords: fresh.map(([c]) => c), title: 'Nouveaux accords à apprendre',
    reason: `Présents dans vos chansons mais pas encore dans celles que vous jouez : ${fresh.map(([c, l]) => `${c} (${l.length})`).join(', ')}.` });
  const avgMin = stats.sessions ? stats.totalSeconds / stats.sessions / 60 : 0;
  out.push({ kind: 'rhythm', title: 'Régularité rythmique au métronome', key: 'rythme',
    reason: stats.sessions && avgMin < 8 ? `Vos séances durent en moyenne ${fmtNum(avgMin, 0)} min : 5 minutes de rythmique au métronome chaque jour suffisent à progresser.` : 'Jouez une grille simple sur le métronome, en commençant lentement (60 à 70 battements par minute), puis accélérez de 5 en 5.' });
  const tabPlayed = stats.top.some((e) => bodyInfo(e.song.body).tabs);
  if (!tabPlayed) {
    const c = CATALOG.find((x) => x.id === 'ode-joie');
    out.push({ kind: 'song', catalogId: c.id, title: 'Lire une tablature : Ode à la joie', reason: 'Vous n’avez pas encore joué de mélodie en tablature : celle-ci tient sur deux cordes et trois cases.' });
  }
  if (!stats.sessions) out.unshift({ kind: 'changes', a: 'G', b: 'C', key: 'chg:C↔G', title: 'Changements G ↔ C en une minute', reason: 'Le premier exercice classique : comptez combien de fois vous passez proprement d’un accord à l’autre en 60 secondes.' });
  return out;
}

/* ---------- Titres pour progresser ---------- */
function suggestSongs(stats, usage, songs, now = Date.now()) {
  const known = usage.knownChords;
  const playedIds = new Set(stats.top.map((e) => e.song.id));
  const levels = stats.top.slice(0, 5).map((e) => songLevel(e.song));
  const myLevel = levels.length ? Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) : 1;
  const cands = [];
  for (const c of CATALOG) if (!catalogOwned(c)) cands.push({ ref: c, catalog: true, body: c.body, title: c.title, difficulty: c.difficulty });
  for (const s of songs) if (!playedIds.has(s.id)) cands.push({ ref: s, catalog: false, body: s.body, title: s.title, difficulty: s.difficulty });
  const scored = cands.map((x) => {
    const list = bodyInfo(x.body).list.filter((c) => parseChord(c));
    const newOnes = list.filter((c) => !known.has(c));
    const level = LEVELS[x.difficulty] || songLevel({ body: x.body, difficulty: x.difficulty });
    let score, reason;
    if (!known.size) {
      score = (level === 1 ? 3 : 0) - list.length * 0.3;
      reason = list.length ? `Niveau ${(x.difficulty || 'débutant').toLowerCase()}, ${list.length} accord${list.length > 1 ? 's' : ''} : ${list.slice(0, 5).join(', ')}.` : `Mélodie en tablature, niveau ${(x.difficulty || 'débutant').toLowerCase()} : idéale pour apprendre à lire une tablature.`;
    } else {
      const cover = list.length ? (list.length - newOnes.length) / list.length : 0;
      score = cover * 2 + (newOnes.length === 1 ? 2 : newOnes.length === 2 ? 1.2 : newOnes.length === 0 ? 0.6 : -newOnes.length * 0.6) + (level === myLevel || level === myLevel + 1 ? 1 : -0.5);
      reason = newOnes.length === 0 ? `Uniquement des accords que vous jouez déjà (${list.slice(0, 5).join(', ')}) : idéal pour gagner en aisance.`
        : `${list.length - newOnes.length} accord${list.length - newOnes.length > 1 ? 's' : ''} que vous connaissez et ${newOnes.length} nouveau${newOnes.length > 1 ? 'x' : ''} : ${newOnes.join(', ')}.`;
      if (bodyInfo(x.body).tabs && !stats.top.some((e) => bodyInfo(e.song.body).tabs)) { score += 0.6; reason += ' Comprend une tablature.'; }
    }
    return { ...x, score, reason, level };
  }).filter((x) => bodyInfo(x.body).list.length || bodyInfo(x.body).tabs).sort((a, b) => b.score - a.score);
  const out = scored.slice(0, 5);
  // favoris délaissés depuis plus de deux semaines
  const stale = songs.filter((s) => s.fav && playedIds.has(s.id)).map((s) => ({ s, last: (stats.top.find((e) => e.song.id === s.id) || {}).last || 0 }))
    .filter((x) => now - x.last > 14 * DAY_MS).slice(0, 2)
    .map((x) => ({ ref: x.s, catalog: false, title: x.s.title, reason: `Un de vos favoris, pas rejoué depuis ${Math.floor((now - x.last) / DAY_MS)} jours : de quoi entretenir votre répertoire.`, revisit: true }));
  return out.concat(stale);
}

/* ---------- Métronome (Web Audio, programmation anticipée pour un tempo stable) ---------- */
const metro = { ctx: null, on: false, bpm: 70, beats: 4, next: 0, beat: 0, timer: 0, onBeat: null };
function metroStart(bpm = metro.bpm) {
  metro.bpm = clamp(Math.round(bpm), 30, 220);
  if (metro.on) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { toast('Ce navigateur ne permet pas de jouer le métronome.', 'err'); return; }
  if (!metro.ctx || metro.ctx.state === 'closed') metro.ctx = new AC();
  if (metro.ctx.state === 'suspended') metro.ctx.resume();
  metro.on = true; metro.beat = 0; metro.next = metro.ctx.currentTime + 0.08;
  metro.timer = setInterval(() => {
    while (metro.next < metro.ctx.currentTime + 0.12) {
      const t = metro.next, strong = metro.beat % metro.beats === 0;
      const o = metro.ctx.createOscillator(), g = metro.ctx.createGain();
      o.frequency.value = strong ? 1568 : 1046; o.type = 'square';
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(strong ? 0.25 : 0.14, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g); g.connect(metro.ctx.destination); o.start(t); o.stop(t + 0.06);
      const b = metro.beat % metro.beats;
      setTimeout(() => { if (metro.on && metro.onBeat) metro.onBeat(b); }, Math.max(0, (t - metro.ctx.currentTime) * 1000));
      metro.beat++; metro.next += 60 / metro.bpm;
    }
  }, 25);
}
function metroStop() { metro.on = false; clearInterval(metro.timer); if (metro.onBeat) metro.onBeat(-1); }
