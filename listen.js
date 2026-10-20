/* Harmonia — écoute pour progresser.
   1. Entendre : un accord ou un enchaînement joué par synthèse (fonctionne partout, sans micro).
   2. Être écouté : reconnaissance des accords joués, au micro ou dans un enregistrement,
      pour compter automatiquement les changements d'un exercice.
   3. Se réécouter : les prises enregistrées pendant un exercice restent sur l'appareil
      (base IndexedDB séparée « harmonia-audio »), pour comparer d'une semaine à l'autre.
   Aucune donnée audio n'est envoyée. */
'use strict';

/* =================== 1. Synthèse =================== */
/** Notes MIDI d'un accord pour l'instrument choisi (position affichée dans le diagramme). */
function chordMidiNotes(name, key = instKey(), idx = 0) {
  const r = chordShapes(name, key);
  const fromPiano = (c) => { const pv = pianoVoicing(c); return [pv.bass !== null ? pv.bass : pv.notes[0] - 12].concat(pv.notes); };
  if (r && r.ok && r.piano) return fromPiano(r.chord);
  if (r && r.ok && r.list && r.list.length) {
    const v = r.list[clamp(idx, 0, r.list.length - 1)], st = instStrings(key);
    const notes = v.frets.map((f, i) => (f >= 0 ? st[i] + f : null)).filter((m) => m !== null);
    if (notes.length) return notes;
  }
  const c = chordPcs(name);
  return c && c.q ? fromPiano(c) : null;
}
const syn = { ctx: null, on: false, timer: 0, next: 0, step: 0, onStep: null, master: null };
function synCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error('Ce navigateur ne permet pas de jouer du son.');
  if (!syn.ctx || syn.ctx.state === 'closed') {
    syn.ctx = new AC();
    syn.master = syn.ctx.createDynamicsCompressor();
    syn.master.connect(syn.ctx.destination);
  }
  if (syn.ctx.state === 'suspended') syn.ctx.resume();
  return syn.ctx;
}
const midiHz = (m) => (S().a4 || 440) * Math.pow(2, (m - 69) / 12);
/** Une corde pincée (ou une note de piano) : deux oscillateurs, filtre qui se referme, décroissance naturelle. */
function pluck(ctx, midi, t, dur, vel, soft) {
  const f = midiHz(midi);
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(Math.min(9000, f * (soft ? 5 : 9)), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.6), t + dur * 0.7);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vel, t + 0.006);
  g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o1.type = 'triangle'; o1.frequency.value = f;
  o2.type = 'sawtooth'; o2.frequency.value = f * 1.001; g2.gain.value = soft ? 0.12 : 0.25;
  o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(syn.master);
  o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}
/** Joue un accord à l'instant t : gratté (cordes), plaqué (piano) ou arpégé (basse). */
function strumAt(ctx, notes, t, { accent = true, up = false, dur = 1.6 } = {}) {
  const key = instKey(), inst = curInst();
  const vel = (accent ? 0.16 : 0.09) / Math.sqrt(Math.max(1, notes.length / 3));
  if (key === 'piano') { notes.forEach((m) => pluck(ctx, m, t, dur * 1.3, vel, true)); return; }
  if (inst.arpeggio) { notes.forEach((m, i) => pluck(ctx, m, t + i * 0.16, dur, vel * 1.4, true)); return; }
  const order = up ? [...notes].reverse() : notes;
  order.forEach((m, i) => pluck(ctx, m, t + i * (accent ? 0.022 : 0.012), dur, vel, false));
}
function playChordNow(name) {
  let ctx;
  try { ctx = synCtx(); } catch (e) { toast(e.message, 'err'); return false; }
  const notes = chordMidiNotes(name, instKey(), typeof cp !== 'undefined' && cp.name === name ? cp.idx : 0);
  if (!notes) { toast(`L’accord ${name} n’est pas reconnu : impossible de le jouer.`, 'err'); return false; }
  strumAt(ctx, notes, ctx.currentTime + 0.03);
  return true;
}
/** Boucle d'accords en rythme : un coup par temps, le premier temps de chaque accord accentué. */
function playLoop(chords, { bpm = 70, beats = 4, onStep = null } = {}) {
  stopLoop();
  let ctx;
  try { ctx = synCtx(); } catch (e) { toast(e.message, 'err'); return false; }
  const seq = chords.map((c) => ({ name: c, notes: chordMidiNotes(c) }));
  const bad = seq.find((x) => !x.notes);
  if (bad) { toast(`L’accord ${bad.name} n’est pas reconnu : impossible de le jouer.`, 'err'); return false; }
  Object.assign(syn, { on: true, next: ctx.currentTime + 0.08, step: 0, onStep });
  const spb = 60 / clamp(bpm, 30, 220);
  syn.timer = setInterval(() => {
    while (syn.on && syn.next < ctx.currentTime + 0.15) {
      const i = Math.floor(syn.step / beats) % seq.length, b = syn.step % beats, t = syn.next;
      strumAt(ctx, seq[i].notes, t, { accent: b === 0, up: b % 2 === 1, dur: Math.min(1.8, spb * (b === beats - 1 ? 1.1 : 2.2)) });
      if (b === 0 && syn.onStep) setTimeout(() => { if (syn.on && syn.onStep) syn.onStep(i); }, Math.max(0, (t - ctx.currentTime) * 1000));
      syn.step++; syn.next += spb;
    }
  }, 25);
  return true;
}
function stopLoop() { syn.on = false; clearInterval(syn.timer); if (syn.onStep) { const f = syn.onStep; syn.onStep = null; f(-1); } }

/* =================== 2. Reconnaissance d'accords =================== */
/** FFT réelle (radix 2, en place) : renvoie le module des fréquences positives. */
function fftMag(input) {
  const n = input.length, re = Float64Array.from(input), im = new Float64Array(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  const mag = new Float64Array(n / 2);
  for (let k = 0; k < n / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
  return mag;
}
const CHROMA_N = 8192;
/** Profil des 12 classes de hauteur d'un extrait (fenêtre de Hann, pics spectraux de 70 à 2 000 Hz).
    Chaque pic est attribué à sa note ; ses harmoniques 3 et 5 (quinte et tierce majeure « fantômes »)
    sont atténuées pour ne pas confondre mineur et majeur. Renvoie aussi le niveau (RMS). */
function chromaFromSamples(x, sr) {
  const n = CHROMA_N, off = Math.max(0, x.length - n), w = new Float64Array(n);
  let rms = 0;
  for (let i = 0; i < n; i++) { const v = x[off + i] || 0; rms += v * v; w[i] = v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))); }
  rms = Math.sqrt(rms / n);
  const mag = fftMag(w), chroma = new Float64Array(12), binHz = sr / n;
  const lo = Math.floor(70 / binHz), hi = Math.min(mag.length - 2, Math.ceil(2000 / binHz));
  let max = 0;
  for (let k = lo; k <= hi; k++) if (mag[k] > max) max = mag[k];
  if (!max) return { chroma, rms };
  const peaks = [];
  for (let k = lo; k <= hi; k++) {
    if (mag[k] < max * 0.04 || mag[k] < mag[k - 1] || mag[k] < mag[k + 1]) continue;
    // interpolation parabolique du sommet pour une fréquence précise
    const a = mag[k - 1], b = mag[k], c = mag[k + 1], d = (a - c) / (2 * (a - 2 * b + c) || 1);
    peaks.push({ f: (k + d) * binHz, m: b });
  }
  for (const p of peaks) {
    // un pic qui est l'harmonique 3 ou 5 d'un pic plus grave et plus fort compte moins
    let weight = 1;
    for (const q of peaks) {
      if (q.f >= p.f || q.m < p.m * 0.6) continue;
      const r = p.f / q.f;
      if (Math.abs(r - 3) < 0.04 || Math.abs(r - 5) < 0.06 || Math.abs(r - 6) < 0.06) { weight = 0.35; break; }
    }
    const midi = 69 + 12 * Math.log2(p.f / (S().a4 || 440));
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    chroma[pc] += Math.sqrt(p.m / max) * weight;
  }
  return { chroma, rms };
}
function chordTemplate(name) {
  const c = chordPcs(name);
  if (!c || !c.q) return null;
  const t = new Float64Array(12);
  c.tones.forEach((pc) => { t[pc] = 1; });
  t[c.root] = 1.3;
  if (c.bass !== null) t[c.bass] = Math.max(t[c.bass], 1);
  return t;
}
function cosine(a, b) {
  let ab = 0, aa = 0, bb = 0;
  for (let i = 0; i < 12; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
}
/** Accord le plus proche parmi les candidats ; null si rien ne ressemble assez (score < seuil). */
function matchChord(chroma, names, threshold = 0.6) {
  let best = null;
  for (const n of names) {
    const t = chordTemplate(n); if (!t) continue;
    const s = cosine(chroma, t);
    if (!best || s > best.score) best = { name: n, score: s };
  }
  if (best && best.score < threshold) return { name: null, score: best.score, near: best.name };
  return best;
}
/** Compte les changements d'accord dans une suite d'étiquettes (une toutes les ~100 ms).
    Un accord n'est retenu qu'après minRun étiquettes identiques : les grattages ratés ne comptent pas. */
function countChanges(labels, minRun = 3) {
  let stable = null, run = 0, prev = null, changes = 0;
  const events = [];
  labels.forEach((l, i) => {
    if (l === prev) run++; else { prev = l; run = 1; }
    if (l && run === minRun && l !== stable) {
      if (stable) { changes++; events.push({ i, from: stable, to: l }); }
      stable = l;
    }
  });
  return { changes, events, first: labels.findIndex((l) => l) };
}
const HOP_S = 0.1;
/** Analyse d'un enregistrement complet (Float32 mono) : étiquettes par trame et changements sur 60 s. */
function analyzeTake(samples, sr, a, b, windowS = 60) {
  const hop = Math.round(sr * HOP_S), labels = [];
  let peak = 0;
  for (let i = 0; i < samples.length; i += 64) peak = Math.max(peak, Math.abs(samples[i]));
  const gate = Math.max(0.004, peak * 0.06);
  for (let end = CHROMA_N; end <= samples.length; end += hop) {
    const { chroma, rms } = chromaFromSamples(samples.subarray(end - CHROMA_N, end), sr);
    labels.push(rms < gate ? null : (matchChord(chroma, [a, b]) || {}).name || null);
  }
  const first = labels.findIndex((l) => l);
  const win = first < 0 ? [] : labels.slice(first, first + Math.round(windowS / HOP_S));
  const res = countChanges(win);
  return { ...res, labels, startS: first < 0 ? 0 : first * HOP_S, durationS: samples.length / sr, recognized: labels.filter(Boolean).length };
}
async function decodeAudioFile(file) {
  if (file.size > 40 * 1024 * 1024) throw new Error('Cet enregistrement dépasse 40 Mo : coupez-le à la minute de l’exercice.');
  const buf = await file.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error('Ce navigateur ne sait pas lire les fichiers audio.');
  const ctx = synCtx();
  let audio;
  try { audio = await ctx.decodeAudioData(buf.slice(0)); }
  catch (e) { throw new Error('Ce fichier audio n’a pas pu être lu. Formats courants acceptés : M4A, MP3, WAV, OGG, WebM.'); }
  const n = audio.length, mono = new Float32Array(n);
  for (let ch = 0; ch < audio.numberOfChannels; ch++) { const d = audio.getChannelData(ch); for (let i = 0; i < n; i++) mono[i] += d[i] / audio.numberOfChannels; }
  return { samples: mono, sr: audio.sampleRate };
}

/* ---------- Écoute au micro, en direct ---------- */
const ear = { stream: null, ctx: null, analyser: null, buf: null, timer: 0, labels: [], stable: null, run: 0, prev: null, onChange: null, onFrame: null, rec: null, chunks: [], recStart: 0 };
function micErrorText(e) {
  const inFrame = window.self !== window.top;
  if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError'))
    return inFrame ? 'Le micro n’est pas disponible dans l’aperçu intégré à Claude. Enregistrez-vous avec le dictaphone de votre téléphone puis utilisez « Analyser un enregistrement », ou ouvrez la version installée.'
      : 'L’accès au micro a été refusé. Autorisez-le dans les réglages du site (icône à gauche de l’adresse), puis réessayez.';
  if (e && e.name === 'NotFoundError') return 'Aucun micro n’a été détecté sur cet appareil.';
  if (e && e.name === 'NotReadableError') return 'Le micro est déjà utilisé par une autre application.';
  return 'Le micro n’a pas pu démarrer' + (e && e.message ? ` (${e.message})` : '') + '.';
}
/** Démarre l'écoute : renvoie true si le micro est ouvert. Rappels : onFrame(nom|null, niveau), onChange(de, vers). */
async function earStart(a, b, { record = true, onFrame, onChange } = {}) {
  earStop();
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Ce navigateur ne donne pas accès au micro.');
  if (window.isSecureContext === false) throw new Error('Le micro n’est accessible que sur une page sécurisée (https ou localhost).');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } }); }
  catch (e) { throw new Error(micErrorText(e)); }
  const ctx = synCtx(), src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser();
  an.fftSize = CHROMA_N; src.connect(an);
  Object.assign(ear, { stream, ctx, analyser: an, buf: new Float32Array(CHROMA_N), labels: [], stable: null, run: 0, prev: null, onChange, onFrame, chunks: [], rec: null });
  if (record && window.MediaRecorder) {
    try {
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported?.(m));
      ear.rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : undefined);
      ear.rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) ear.chunks.push(ev.data); };
      ear.rec.start(1000); ear.recStart = Date.now();
    } catch (e) { ear.rec = null; }
  }
  let level = 0;
  ear.timer = setInterval(() => {
    an.getFloatTimeDomainData(ear.buf);
    const { chroma, rms } = chromaFromSamples(ear.buf, ctx.sampleRate);
    level = Math.max(rms, level * 0.85);
    const m = rms < 0.006 ? null : matchChord(chroma, [a, b]);
    const l = m ? m.name : null;
    if (l === ear.prev) ear.run++; else { ear.prev = l; ear.run = 1; }
    if (l && ear.run === 3 && l !== ear.stable) { const from = ear.stable; ear.stable = l; if (from && ear.onChange) ear.onChange(from, l); }
    if (ear.onFrame) ear.onFrame(l, Math.min(1, level * 8), m && !m.name ? m.near : null);
  }, HOP_S * 1000);
  return true;
}
/** Arrête l'écoute ; renvoie la prise enregistrée (Blob) si demandé. */
function earStop(keepTake = false) {
  clearInterval(ear.timer); ear.timer = 0;
  const rec = ear.rec, chunks = ear.chunks, stream = ear.stream, started = ear.recStart;
  ear.rec = null; ear.onFrame = null; ear.onChange = null; ear.stream = null;
  const done = new Promise((resolve) => {
    if (!rec || rec.state === 'inactive') { resolve(null); return; }
    rec.onstop = () => resolve(keepTake && chunks.length ? { blob: new Blob(chunks, { type: rec.mimeType || 'audio/webm' }), seconds: Math.round((Date.now() - started) / 1000) } : null);
    try { rec.stop(); } catch (e) { resolve(null); }
  });
  return done.then((take) => { if (stream) stream.getTracks().forEach((t) => t.stop()); return take; });
}

/* =================== 3. Prises enregistrées (sur l'appareil) =================== */
const TAKES_DB = 'harmonia-audio', TAKES_KEEP = 6;
function takesDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('Stockage indisponible')); return; }
    const req = indexedDB.open(TAKES_DB, 1);
    req.onupgradeneeded = () => { const s = req.result.createObjectStore('takes', { keyPath: 'id' }); s.createIndex('key', 'key'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Stockage refusé'));
  });
}
async function takesList(key) {
  const d = await takesDb();
  return new Promise((resolve, reject) => {
    const r = d.transaction('takes').objectStore('takes').index('key').getAll(key);
    r.onsuccess = () => { d.close(); resolve(r.result.sort((x, y) => y.at - x.at)); };
    r.onerror = () => { d.close(); reject(r.error); };
  });
}
/** Ajoute une prise et ne garde que les plus récentes. N'annonce le succès qu'après l'écriture. */
async function takeSave(key, blob, info) {
  const old = await takesList(key);
  const d = await takesDb();
  await new Promise((resolve, reject) => {
    const tx = d.transaction('takes', 'readwrite'), st = tx.objectStore('takes');
    st.put({ id: uid(), key, at: Date.now(), blob, ...info });
    old.slice(TAKES_KEEP - 1).forEach((t) => st.delete(t.id));
    tx.oncomplete = () => { d.close(); resolve(); };
    tx.onerror = tx.onabort = () => { d.close(); reject(tx.error || new Error('Écriture refusée')); };
  });
}
async function takeDelete(id) {
  const d = await takesDb();
  await new Promise((resolve, reject) => {
    const tx = d.transaction('takes', 'readwrite'); tx.objectStore('takes').delete(id);
    tx.oncomplete = () => { d.close(); resolve(); };
    tx.onerror = () => { d.close(); reject(tx.error); };
  });
}
async function takesClearAll() {
  const d = await takesDb();
  await new Promise((resolve) => { const tx = d.transaction('takes', 'readwrite'); tx.objectStore('takes').clear(); tx.oncomplete = tx.onerror = () => { d.close(); resolve(); }; });
}
