/* Harmonia — interface de l’accordeur */
'use strict';
/* ===================================================================
   Accordeur : interface (vue, aiguille, messages)
   =================================================================== */
function viewTuner() {
  const t = TUNINGS[S().tuning];
  const secure = window.isSecureContext !== false;
  const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && !!(window.AudioContext || window.webkitAudioContext);
  return `<div class="view tuner">
    <header class="page-head"><h1>Accordeur</h1><p>Lancez le micro, jouez une corde à la fois et laissez-la sonner. L’aiguille indique l’écart en cents : au centre, la corde est juste.</p></header>
    <div class="tn-controls">
      <div class="field"><label for="tn-inst">Instrument</label><select id="tn-inst" class="select" data-inst="1">${instrumentOptions()}</select></div>
      <div class="field"><label for="tn-tuning">Accordage</label><select id="tn-tuning" class="select">${tuningsFor(instKey()).map(([k, v]) => `<option value="${k}" ${S().tuning === k ? 'selected' : ''}>${v.name} · ${v.label}</option>`).join('')}</select></div>
      <div class="field"><span class="label">Corde visée</span>
        <div class="strings" role="group" aria-label="Corde visée" id="tn-strings">${t.strings.length ? `<button type="button" data-act="tn-target" data-t="auto" aria-pressed="${tn.target === 'auto'}"><b>Auto</b><small>détection</small></button>` + t.strings.map((m, i) => `<button type="button" data-act="tn-target" data-t="${i}" data-m="${m}" aria-pressed="${String(tn.target) === String(i)}"><b>${midiName(m)}</b><small>${t.strings.length - i}<sup>e</sup> · ${fmtNum(midiFreq(m), 1)}</small></button>`).join('') : '<p class="muted" style="font-size:14px">Mode chromatique : la note la plus proche est affichée.</p>'}</div>
      </div>
    </div>
    <div class="tn-stage idle" id="tn-stage">
      ${gaugeSVG()}
      <div class="tn-note" id="tn-note" aria-live="off">—</div>
      <div class="tn-fr num" id="tn-fr">Aucun son analysé</div>
      <div class="tn-status" id="tn-status" role="status">${icon('mic', 'sm')}Micro arrêté</div>
      <dl class="tn-stats">
        <div><dt>Fréquence</dt><dd id="tn-hz" class="num">—</dd></div>
        <div><dt>Écart</dt><dd id="tn-cents" class="num">—</dd></div>
        <div><dt>Corde proche</dt><dd id="tn-near">—</dd></div>
        <div><dt>Cible</dt><dd id="tn-target-hz" class="num">—</dd></div>
      </dl>
    </div>
    <div class="row tn-actions">
      <button class="btn btn-primary" data-act="tn-start" id="tn-start" ${supported ? '' : 'disabled'}>${icon('mic', 'sm')}Démarrer le micro</button>
      <button class="btn btn-ghost" data-act="tn-stop" id="tn-stopbtn" hidden>${icon('stop', 'sm')}Arrêter</button>
      <button class="btn btn-soft tn-sec" data-act="tn-ref" title="Écouter la note cible">${icon('speaker', 'sm')}<span class="tn-lbl">Écouter la note cible</span></button>
      <label class="btn btn-ghost tn-sec" for="tn-file" title="Analyser un enregistrement">${icon('file', 'sm')}<span class="tn-lbl">Analyser un enregistrement</span></label>
      <input id="tn-file" type="file" accept="audio/*" class="sr-only">
    </div>
    <div id="tn-msg" role="status">${!supported ? `<div class="notice err">${icon('info')}<p>Ce navigateur ne permet pas d’analyser le micro (Web Audio ou getUserMedia absents). Essayez une version récente de Firefox, Chrome, Edge ou Safari.</p></div>` : !secure ? `<div class="notice warn">${icon('lock')}<p>Le micro n’est accessible que sur une page sécurisée (adresse en https ou localhost).</p></div>` : ''}</div>
    <p class="help">Diapason La = ${S().a4} Hz, tolérance ±${S().tolerance} cents (modifiables dans les réglages). Le micro s’arrête dès que vous quittez l’accordeur. Aucun son n’est enregistré ni envoyé.</p>
  </div>`;
}
function gaugeSVG() {
  const cx = 160, cy = 168, R = 128;
  const ang = (c) => (c / 50) * 62 * Math.PI / 180;
  const pt = (c, r) => [cx + r * Math.sin(ang(c)), cy - r * Math.cos(ang(c))];
  const arc = (c1, c2, r) => { const [x1, y1] = pt(c1, r), [x2, y2] = pt(c2, r); return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
  const tol = S().tolerance;
  let ticks = '';
  for (let c = -50; c <= 50; c += 5) {
    const major = c % 25 === 0;
    const [x1, y1] = pt(c, R - 14), [x2, y2] = pt(c, R - (major ? 30 : 22));
    ticks += `<line class="g-tick ${major ? 'major' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    if (major) { const [lx, ly] = pt(c, R - 46); ticks += `<text class="g-lbl" x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle">${c > 0 ? '+' + c : c === 0 ? '0' : '−' + Math.abs(c)}</text>`; }
  }
  return `<svg class="gauge" viewBox="0 0 320 190" role="img" aria-label="Indicateur de justesse, de −50 à +50 cents">
    <path class="g-arc" d="${arc(-50, 50, R)}"/>
    <path class="g-zone" d="${arc(-tol, tol, R)}"/>
    ${ticks}
    <text class="g-lbl" x="28" y="186">Trop grave</text><text class="g-lbl" x="292" y="186" text-anchor="end">Trop aigu</text>
    <g class="g-needle-wrap" id="tn-needle" style="transform-origin:${cx}px ${cy}px"><line class="g-needle" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - R + 8}"/></g>
    <circle class="g-hub" cx="${cx}" cy="${cy}" r="7"/>
  </svg>`;
}
function afterTuner() {
  $('#tn-tuning').addEventListener('change', (e) => { S().tuning = e.target.value; tn.target = 'auto'; save(); const was = tn.mode; const keep = tn.analyser; render(); if (keep) setTunerRunningUI(was); });
  $('#tn-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) tunerFile(f); e.target.value = ''; });
  if (tn.analyser) setTunerRunningUI(tn.mode);
}
function tnMsg(html, kind = 'warn', ic = 'info') { const m = $('#tn-msg'); if (m) m.innerHTML = html ? `<div class="notice ${kind}">${icon(ic)}<p>${html}</p></div>` : ''; }
function setTunerRunningUI(mode) {
  const st = $('#tn-start'), sp = $('#tn-stopbtn');
  if (st) st.hidden = mode !== 'off';
  if (sp) sp.hidden = mode === 'off';
  if (mode === 'off') setStatus('off');
  else setStatus('wait');
}
function showReading(m) {
  const tuning = TUNINGS[S().tuning];
  let target, near = null;
  if (!tuning.strings.length) target = Math.round(m);
  else if (tn.target === 'auto') {
    let best = 0;
    tuning.strings.forEach((sm, i) => { if (Math.abs(m - sm) < Math.abs(m - tuning.strings[best])) best = i; });
    near = best; target = tuning.strings[best];
  } else { near = Number(tn.target); target = tuning.strings[near]; }
  const autoNear = tuning.strings.length ? tuning.strings.reduce((b, sm, i) => Math.abs(m - sm) < Math.abs(m - tuning.strings[b]) ? i : b, 0) : null;
  const cents = (m - target) * 100;
  const det = Math.round(m);
  const hz = S().a4 * Math.pow(2, (m - 69) / 12);
  tn.needle += (clamp(cents, -55, 55) - tn.needle) * 0.45;
  const needle = $('#tn-needle'); if (needle) needle.style.transform = `rotate(${(tn.needle / 50) * 62}deg)`;
  const set = (id, v) => { const e = $('#' + id); if (e) e.innerHTML = v; };
  set('tn-note', `${midiName(det)}<sub>${midiOct(det)}</sub>`);
  set('tn-fr', `${FR_NOTES[midiName(det)[0]]}${midiName(det)[1] === '#' ? ' dièse' : ''} · ${midiOct(det)}<sup>e</sup> octave`);
  set('tn-hz', `${fmtNum(hz, 1)} Hz`);
  set('tn-cents', `${cents > 0 ? '+' : cents < 0 ? '−' : ''}${fmtNum(Math.abs(cents), 0)} ct`);
  set('tn-near', autoNear !== null ? `${midiName(tuning.strings[autoNear])} · ${tuning.strings.length - autoNear}<sup>e</sup>` : `${midiName(det)}${midiOct(det)}`);
  set('tn-target-hz', `${midiName(target)}${midiOct(target)} · ${fmtNum(midiFreq(target), 1)} Hz`);
  $$('#tn-strings button').forEach((b) => b.classList.toggle('hit', b.dataset.t !== 'auto' && Number(b.dataset.t) === near));
  $('#tn-stage')?.classList.remove('idle');
  if (Math.abs(cents) <= S().tolerance) setStatus('ok'); else setStatus(cents < 0 ? 'low' : 'high', Math.abs(cents) > 60);
}
function setStatus(k, far) {
  const st = $('#tn-status'), stage = $('#tn-stage');
  if (!st) return;
  const map = {
    off: [icon('mic', 'sm') + 'Micro arrêté', ''],
    wait: [icon('mic', 'sm') + 'En écoute : jouez une corde', ''],
    unclear: [icon('info', 'sm') + 'Son pas assez net : jouez une seule corde', ''],
    ok: [icon('check', 'sm') + 'Accordée', 'ok'],
    low: [icon('arrowup', 'sm') + (far ? 'Trop grave : tendez nettement la corde' : 'Trop grave : tendez la corde'), 'low'],
    high: [icon('arrowdown', 'sm') + (far ? 'Trop aiguë : détendez nettement la corde' : 'Trop aiguë : détendez la corde'), 'high']
  };
  const [html, cls] = map[k];
  if (st.dataset.k !== k + far) { st.innerHTML = html; st.className = 'tn-status ' + cls; st.dataset.k = k + far; }
  stage?.classList.toggle('tuned', k === 'ok');
}
function resetReadout(keepStatus) {
  ['tn-hz', 'tn-cents', 'tn-near', 'tn-target-hz'].forEach((id) => { const e = $('#' + id); if (e) e.textContent = '—'; });
  const n = $('#tn-note'); if (n) n.textContent = '—';
  const f = $('#tn-fr'); if (f) f.textContent = 'Aucun son analysé';
  const nd = $('#tn-needle'); if (nd) nd.style.transform = 'rotate(0deg)';
  tn.needle = 0;
  $('#tn-stage')?.classList.add('idle');
  $$('#tn-strings button').forEach((b) => b.classList.remove('hit'));
  if (!keepStatus) setStatus('off');
}