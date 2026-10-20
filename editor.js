/* Harmonia — interface : éditeur de chansons */
'use strict';
/* ===================================================================
   Éditeur
   =================================================================== */
let draft = null;
function viewEdit() {
  const editing = ui.editId ? songById(ui.editId) : null;
  if (!draft) draft = editing ? { ...editing } : makeSong({ title: ui._newTitle || '', body: '' }, 'manual');
  ui._newTitle = '';
  const d = draft;
  const info = bodyInfo(d.body, d.tab);
  return `<div class="view">
    <header class="toolbar">
      <div class="page-head"><h1>${editing ? 'Modifier la fiche' : 'Nouvelle chanson'}</h1><p>Écrivez les accords entre crochets juste avant la syllabe concernée, ou collez une partition « accords au-dessus des paroles » puis convertissez-la.</p></div>
    </header>
    <form class="ed-grid" data-form="edit" novalidate>
      <div class="ed-meta">
        <div class="field" style="grid-column: 1 / -1"><label for="ed-title">Titre <span class="muted">(obligatoire)</span></label><input id="ed-title" class="input" value="${esc(d.title)}" required maxlength="120"><span class="err-text" id="ed-title-err" hidden>Indiquez un titre pour enregistrer la chanson.</span></div>
        <div class="field"><label for="ed-artist">Artiste</label><input id="ed-artist" class="input" value="${esc(d.artist)}" maxlength="120"></div>
        <div class="field"><label for="ed-key">Tonalité d’origine</label><input id="ed-key" class="input" value="${esc(d.key)}" placeholder="ex. G, Am, F#m" maxlength="6"><span class="err-text" id="ed-key-err" hidden>Tonalité non reconnue : utilisez une lettre de A à G, suivie si besoin de #, b ou m.</span></div>
        <div class="field"><label for="ed-capo">Capo</label><select id="ed-capo" class="select"><option value="">Sans capo</option>${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${String(d.capo) === String(i + 1) ? 'selected' : ''}>Case ${i + 1}</option>`).join('')}</select></div>
        <div class="field"><label for="ed-diff">Difficulté</label><select id="ed-diff" class="select">${['', 'Débutant', 'Intermédiaire', 'Avancé'].map((v) => `<option value="${v}" ${d.difficulty === v ? 'selected' : ''}>${v || 'Non précisée'}</option>`).join('')}</select></div>
        <div class="field" style="grid-column: 1 / -1"><label for="ed-struct">Structure du morceau</label><input id="ed-struct" class="input" value="${esc(d.structure)}" placeholder="ex. Intro – Couplet – Refrain – Couplet – Refrain – Pont – Refrain"></div>
      </div>
      <div class="ed-split">
        <div class="field">
          <label for="ed-body">Paroles et accords</label>
          <div class="ed-tools" role="group" aria-label="Outils d’édition">
            <label class="sr-only" for="ed-chord">Accord à insérer</label>
            <input id="ed-chord" class="input" placeholder="Accord" maxlength="12">
            <button type="button" class="btn btn-soft sm" data-act="ed-ins-chord">Insérer l’accord</button>
            <button type="button" class="btn btn-ghost sm" data-act="ed-sec" data-k="verse">Couplet</button>
            <button type="button" class="btn btn-ghost sm" data-act="ed-sec" data-k="chorus">Refrain</button>
            <button type="button" class="btn btn-ghost sm" data-act="ed-sec" data-k="bridge">Pont</button>
            <button type="button" class="btn btn-ghost sm" data-act="ed-sec" data-k="label">Repère</button>
            <button type="button" class="btn btn-rose sm" data-act="ed-convert">Convertir « accords au-dessus »</button>
          </div>
          <div class="row" id="ed-chips" style="gap:6px">${info.list.map((c) => `<button type="button" class="chip" data-act="ed-chip" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
          <textarea id="ed-body" class="textarea mono" rows="18" spellcheck="false" placeholder="{start_of_verse: Couplet 1}&#10;[G]Les paroles avec les [D]accords&#10;{end_of_verse}">${esc(d.body)}</textarea>
          <p class="help">Exemple : <code>Au [C]clair de la [G]lune</code> place Do au-dessus de « clair ». Sections : <code>{start_of_chorus}</code> … <code>{end_of_chorus}</code>, repère : <code>{comment: Intro}</code>, tablature : <code>{start_of_tab}</code> … <code>{end_of_tab}</code>. Notation anglo-saxonne : A = La, B = Si, C = Do, D = Ré, E = Mi, F = Fa, G = Sol.</p>
        </div>
        <div class="field">
          <span class="label">Aperçu du rendu final</span>
          <div class="preview" id="ed-preview" style="--scale:1"><div class="rd-body">${renderSongBody(d.body, 0, false, false) || '<p class="muted" style="font-size:15px;padding:14px 0">L’aperçu apparaîtra ici.</p>'}</div></div>
        </div>
      </div>
      <div class="field"><label for="ed-tab">Tablature (facultative)</label><textarea id="ed-tab" class="textarea mono" rows="7" spellcheck="false" placeholder="e|-----0-----|&#10;B|---1---1---|&#10;G|-2-------2-|">${esc(d.tab)}</textarea><span class="hint">Six lignes, de la corde aiguë (e) à la grave (E). Respectez les espacements.</span></div>
      <div class="field"><label for="ed-notes">Notes personnelles</label><textarea id="ed-notes" class="textarea" rows="4" placeholder="Rythmique, astuces, rappels…">${esc(d.notes)}</textarea></div>
      <div class="row" style="justify-content:flex-end">
        <button type="button" class="btn btn-ghost" data-act="ed-cancel">Annuler</button>
        <button type="submit" class="btn btn-primary">${icon('check', 'sm')}Enregistrer</button>
      </div>
    </form>
  </div>`;
}
function readDraft() {
  draft.title = $('#ed-title').value; draft.artist = $('#ed-artist').value; draft.key = $('#ed-key').value.trim();
  draft.capo = $('#ed-capo').value; draft.difficulty = $('#ed-diff').value; draft.structure = $('#ed-struct').value;
  draft.body = $('#ed-body').value; draft.tab = $('#ed-tab').value; draft.notes = $('#ed-notes').value;
}
let previewTimer = 0;
function updatePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    if (!draft || !$('#ed-body')) return;
    readDraft();
    const html = renderSongBody(draft.body, 0, false, false);
    $('#ed-preview .rd-body').innerHTML = html || '<p class="muted" style="font-size:15px;padding:14px 0">L’aperçu apparaîtra ici.</p>';
    const list = bodyInfo(draft.body).list;
    $('#ed-chips').innerHTML = list.map((c) => `<button type="button" class="chip" data-act="ed-chip" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  }, 120);
}
function afterEdit() {
  ['ed-body', 'ed-title', 'ed-artist', 'ed-key', 'ed-struct', 'ed-tab', 'ed-notes'].forEach((id) => $('#' + id)?.addEventListener('input', updatePreview));
  $('#ed-title').focus();
}
function insertAtCursor(ta, text) {
  const a = ta.selectionStart, b = ta.selectionEnd;
  ta.value = ta.value.slice(0, a) + text + ta.value.slice(b);
  ta.selectionStart = ta.selectionEnd = a + text.length;
  ta.focus();
  updatePreview();
}
function saveDraft() {
  clearTimeout(previewTimer);
  readDraft();
  const titleErr = $('#ed-title-err'), keyErr = $('#ed-key-err');
  titleErr.hidden = !!draft.title.trim();
  const keyOk = !draft.key || !!parseChord(draft.key);
  keyErr.hidden = keyOk;
  if (!draft.title.trim()) { $('#ed-title').focus(); return; }
  if (!keyOk) { $('#ed-key').focus(); return; }
  draft.updatedAt = Date.now();
  const existing = songById(draft.id);
  if (existing) Object.assign(existing, makeSong({ ...existing, ...draft }));
  else store.songs.push(makeSong(draft, 'manual'));
  const id = draft.id;
  draft = null;
  commit('Chanson enregistrée');
  openSong(id);
}

