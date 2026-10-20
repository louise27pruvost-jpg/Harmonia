/* Harmonia — traitement audio de l’accordeur */
'use strict';
/* ===================================================================
   Accordeur : traitement audio (micro, détection de fréquence)
   =================================================================== */
const TUNINGS = {
  standard: { inst: 'guitare', name: 'Standard', label: 'E A D G B E', strings: [40, 45, 50, 55, 59, 64] },
  dstandard: { inst: 'guitare', name: 'Ré standard', label: 'D G C F A D', strings: [38, 43, 48, 53, 57, 62] },
  dropd: { inst: 'guitare', name: 'Drop D', label: 'D A D G B E', strings: [38, 45, 50, 55, 59, 64] },
  uke_std: { inst: 'ukulele', name: 'Standard (Sol aigu)', label: 'G C E A', strings: [67, 60, 64, 69] },
  uke_low: { inst: 'ukulele', name: 'Sol grave', label: 'G C E A', strings: [55, 60, 64, 69] },
  mando: { inst: 'mandoline', name: 'Standard', label: 'G D A E', strings: [55, 62, 69, 76] },
  bass4: { inst: 'basse', name: '4 cordes', label: 'E A D G', strings: [28, 33, 38, 43] },
  bass5: { inst: 'basse', name: '5 cordes', label: 'B E A D G', strings: [23, 28, 33, 38, 43] },
  chromatic: { inst: '*', name: 'Chromatique', label: 'Toutes les notes', strings: [] }
};
/** Accordages proposés pour l'instrument choisi (plus le mode chromatique). */
function tuningsFor(key) { return Object.entries(TUNINGS).filter(([, t]) => t.inst === key || t.inst === '*'); }
/** Bornes de fréquence de détection selon l'accordage. */
function detectRange() {
  const t = TUNINGS[S().tuning];
  if (!t || !t.strings.length) return [27, 1400];
  const lo = midiFreq(Math.min(...t.strings)), hi = midiFreq(Math.max(...t.strings));
  return [Math.max(25, lo * 0.75), Math.min(1500, hi * 1.9)];
}
const midiName = (m, flats = false) => spell(m % 12, flats);
const midiOct = (m) => Math.floor(m / 12) - 1;
const midiFreq = (m) => S().a4 * Math.pow(2, (m - 69) / 12);
const tn = { ctx: null, stream: null, nodes: [], analyser: null, buf: null, raf: 0, last: 0, hist: [], target: 'auto', needle: 0, source: null, mode: 'off', lastGood: 0, out: null, tunedSince: 0 };

function ensureCtx() {
  if (!tn.ctx || tn.ctx.state === 'closed') { const AC = window.AudioContext || window.webkitAudioContext; tn.ctx = new AC(); }
  if (tn.ctx.state === 'suspended') tn.ctx.resume();
  return tn.ctx;
}
async function tunerStart() {
  if (!navigator.mediaDevices?.getUserMedia) { tnMsg('Ce navigateur ne donne pas accès au micro.', 'err'); return; }
  if (window.isSecureContext === false) { tnMsg('Le micro n’est accessible que sur une page sécurisée (https ou localhost).', 'warn', 'lock'); return; }
  tunerStop(true);
  tnMsg('Autorisez l’accès au micro dans la fenêtre de votre navigateur.', '', 'mic');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
  catch (e) {
    const inFrame = window.self !== window.top;
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) {
      tnMsg(inFrame
        ? 'L’accès au micro a été refusé. Dans l’aperçu intégré à Claude, le micro n’est pas disponible : ouvrez le fichier <strong>harmonia.html</strong> dans votre navigateur (ou hébergez-le en https), ou utilisez « Analyser un enregistrement » ci-dessus.'
        : 'L’accès au micro a été refusé. Autorisez-le dans les réglages du site de votre navigateur (icône à gauche de l’adresse), puis réessayez.', 'err', 'lock');
    } else if (e && e.name === 'NotFoundError') tnMsg('Aucun micro n’a été détecté sur cet appareil.', 'err');
    else if (e && e.name === 'NotReadableError') tnMsg('Le micro est déjà utilisé par une autre application. Fermez-la puis réessayez.', 'err');
    else tnMsg('Le micro n’a pas pu démarrer' + (e && e.message ? ' (' + esc(e.message) + ')' : '') + '.', 'err');
    return;
  }
  if (ui.view !== 'tuner') { stream.getTracks().forEach((t) => t.stop()); return; }
  tn.stream = stream;
  const ctx = ensureCtx();
  const src = ctx.createMediaStreamSource(stream);
  buildGraph(src, false);
  tn.mode = 'mic';
  tnMsg('');
  setTunerRunningUI('mic');
}
async function tunerFile(file) {
  tunerStop(true);
  try {
    const ctx = ensureCtx();
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    const src = ctx.createBufferSource();
    src.buffer = buf;
    buildGraph(src, true);
    src.onended = () => { if (tn.source === src) { tunerStop(); tnMsg(`Analyse de « ${esc(file.name)} » terminée.`, 'ok', 'check'); } };
    src.start();
    tn.mode = 'file';
    tnMsg(`Analyse de « ${esc(file.name)} » en cours (${fmtNum(buf.duration, 1)} s). Le son est lu pendant l’analyse.`, '', 'file');
    setTunerRunningUI('file');
  } catch (e) { tnMsg('Ce fichier audio n’a pas pu être lu. Essayez un fichier MP3, WAV, OGG ou M4A.', 'err'); }
}
function buildGraph(src, audible) {
  const ctx = tn.ctx;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = Math.max(18, Math.min(55, detectRange()[0] * 0.7)); hp.Q.value = 0.7;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.7;
  const an = ctx.createAnalyser(); an.fftSize = detectRange()[0] < 55 ? 8192 : 4096; an.smoothingTimeConstant = 0;
  src.connect(hp); hp.connect(lp); lp.connect(an);
  if (audible) src.connect(ctx.destination);
  tn.source = src; tn.nodes = [src, hp, lp, an]; tn.analyser = an; tn.buf = new Float32Array(an.fftSize);
  tn.hist = []; tn.lastGood = 0; tn.needle = 0;
  tn.raf = requestAnimationFrame(tunerLoop);
}
function tunerStop(silent, closeCtx) {
  cancelAnimationFrame(tn.raf);
  if (tn.source && tn.source.stop) { try { tn.source.onended = null; tn.source.stop(); } catch (e) { /* déjà arrêté */ } }
  tn.nodes.forEach((n) => { try { n.disconnect(); } catch (e) { /* rien */ } });
  if (tn.stream) tn.stream.getTracks().forEach((t) => t.stop());
  tn.stream = null; tn.nodes = []; tn.analyser = null; tn.source = null; tn.mode = 'off';
  if (tn.ctx && closeCtx) { try { tn.ctx.close(); } catch (e) { /* rien */ } tn.ctx = null; }
  if (!silent) { setTunerRunningUI('off'); resetReadout(); }
}
/* Détection de fréquence fondamentale — algorithme YIN (de Cheveigné & Kawahara, 2002) */
function yin(buf, sr, fmin, fmax, thresh = 0.12) {
  const half = Math.floor(buf.length / 2);
  const tauMin = Math.max(2, Math.floor(sr / fmax));
  const tauMax = Math.min(half - 1, Math.ceil(sr / fmin));
  const d = new Float32Array(tauMax + 2);
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    let sum = 0;
    for (let i = 0; i < half; i++) { const x = buf[i] - buf[i + tau]; sum += x * x; }
    d[tau] = sum;
  }
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax + 1; tau++) { running += d[tau]; d[tau] = running ? d[tau] * tau / running : 1; }
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (d[t] < thresh) { while (t + 1 <= tauMax && d[t + 1] < d[t]) t++; tau = t; break; }
  }
  if (tau < 0) return null;
  const a = d[tau - 1], b = d[tau], c = d[tau + 1];
  const den = a + c - 2 * b;
  const shift = den ? (a - c) / (2 * den) : 0;
  return { freq: sr / (tau + shift), clarity: 1 - b };
}
function tunerLoop(ts) {
  tn.raf = requestAnimationFrame(tunerLoop);
  if (!tn.analyser || ts - tn.last < 45) return;
  tn.last = ts;
  tn.analyser.getFloatTimeDomainData(tn.buf);
  let rms = 0;
  for (let i = 0; i < tn.buf.length; i++) rms += tn.buf[i] * tn.buf[i];
  rms = Math.sqrt(rms / tn.buf.length);
  const chrom = S().tuning === 'chromatic';
  const [fmin, fmax] = detectRange();
  const r = rms > 0.008 ? yin(tn.buf, tn.ctx.sampleRate, fmin, fmax) : null;
  if (r && r.clarity > 0.86 && r.freq > 40) {
    const m = 69 + 12 * Math.log2(r.freq / S().a4);
    tn.hist.push(m); if (tn.hist.length > 7) tn.hist.shift();
    const sorted = tn.hist.slice().sort((x, y) => x - y);
    const med = sorted[Math.floor(sorted.length / 2)];
    const close = tn.hist.filter((x) => Math.abs(x - med) < 0.35);
    if (close.length >= 3) {
      const avg = close.reduce((p, q) => p + q, 0) / close.length;
      tn.lastGood = ts;
      showReading(avg);
      return;
    }
  } else if (!r) {
    if (tn.hist.length) tn.hist.shift();
  }
  if (ts - tn.lastGood > 700) { if (tn.lastGood) resetReadout(true); setStatus(rms > 0.008 ? 'unclear' : 'wait'); }
}
function playRef() {
  const tuning = TUNINGS[S().tuning];
  let m;
  if (!tuning.strings.length) m = 69;
  else if (tn.target === 'auto') m = tuning.strings[0];
  else m = tuning.strings[Number(tn.target)];
  try {
    const ctx = ensureCtx();
    const f = midiFreq(m), t0 = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t0); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + 2);
    [[1, 'triangle', 1], [2, 'sine', 0.3]].forEach(([mult, type, amp]) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mult;
      const og = ctx.createGain(); og.gain.value = amp; o.connect(og); og.connect(lp); o.start(t0); o.stop(t0 + 2.7);
    });
    lp.connect(g); g.connect(ctx.destination);
    toast(`Note de référence : ${midiName(m)}${midiOct(m)} · ${fmtNum(f, 1)} Hz`);
  } catch (e) { toast('Le son ne peut pas être joué dans ce navigateur.', 'err'); }
}

