/* Harmonia — interface : réglages */
'use strict';
/* ===================================================================
   Réglages
   =================================================================== */
function applySettings() {
  const s = S();
  document.documentElement.dataset.appTheme = s.theme;
  document.documentElement.classList.toggle('contrast', !!s.contrast);
  document.documentElement.classList.toggle('reduce-motion', !!s.reduceMotion);
  applyCustomColors();
}
function viewSettings() {
  const s = S();
  const radio = (name, val, label, cur) => `<button type="button" data-act="set" data-k="${name}" data-v="${val}" aria-pressed="${cur === val}">${label}</button>`;
  return `<div class="view">
    <header class="page-head"><h1>Réglages</h1><p>Vos préférences sont enregistrées dans ce navigateur, sur cet appareil.</p></header>
    <section class="card set-group" aria-labelledby="s-look"><h2 id="s-look">Apparence</h2>
      <div class="set-row"><div><div class="label">Thème</div><div class="desc">Clair par défaut, pour une bonne lisibilité en séance.</div></div>
        <div class="seg" role="group" aria-label="Thème">${radio('theme', 'light', 'Clair', s.theme)}${radio('theme', 'dark', 'Sombre', s.theme)}${radio('theme', 'system', 'Système', s.theme)}</div></div>
      <div class="set-row"><div><label class="label" for="set-scale">Taille du texte des chansons</label><div class="desc">Les accords restent alignés quelle que soit la taille.</div></div>
        <div class="ctl"><input id="set-scale" type="range" min="0.8" max="1.6" step="0.05" value="${s.textScale}"><output class="num" id="set-scale-out" style="min-width:48px">${Math.round(s.textScale * 100)} %</output></div></div>
      <div class="set-sub"><h3>Couleurs</h3>${colorSettingsHTML()}</div>
      <label class="check"><input type="checkbox" data-set="contrast" ${s.contrast ? 'checked' : ''}><span><span class="label">Contraste renforcé</span><br><span class="desc muted" style="font-size:13.5px">Textes secondaires et bordures plus foncés.</span></span></label>
      <label class="check"><input type="checkbox" data-set="reduceMotion" ${s.reduceMotion ? 'checked' : ''}><span><span class="label">Réduire les animations</span><br><span class="desc muted" style="font-size:13.5px">La préférence de votre système est respectée dans tous les cas.</span></span></label>
    </section>
    <section class="card set-group" aria-labelledby="s-read"><h2 id="s-read">Lecture</h2>
      <div class="set-row"><div><label class="label" for="set-speed">Vitesse de défilement</label><div class="desc">De ×0,25 à ×3. Conservée d’une séance à l’autre.</div></div>
        <div class="ctl"><input id="set-speed" type="range" min="0.25" max="3" step="0.05" value="${s.scrollSpeed}"><output class="num" id="set-speed-out" style="min-width:48px">×${fmtNum(s.scrollSpeed)}</output></div></div>
      <div class="set-row"><div><label class="label" for="set-inst">Instrument</label><div class="desc">Diagrammes, tablatures et accordeur s’adaptent. Modifiable aussi depuis chaque chanson.</div></div>
        <div class="ctl">${instrumentPicker('set-inst', false)}</div></div>
      <div class="set-row"><div><div class="label">Altérations après transposition</div><div class="desc">Automatique : selon la tonalité obtenue (Fa, Si♭… en bémols).</div></div>
        <div class="seg" role="group" aria-label="Altérations">${radio('accidentals', 'auto', 'Automatique', s.accidentals)}${radio('accidentals', 'sharps', 'Dièses ♯', s.accidentals)}${radio('accidentals', 'flats', 'Bémols ♭', s.accidentals)}</div></div>
      <label class="check"><input type="checkbox" data-set="trackPractice" ${s.trackPractice ? 'checked' : ''}><span><span class="label">Suivre ma pratique</span><br><span class="desc muted" style="font-size:13.5px">Temps de jeu par chanson, sur cet appareil uniquement, pour la page « Ma progression ».</span></span></label>
      <label class="check"><input type="checkbox" data-set="showTabs" ${s.showTabs ? 'checked' : ''}><span class="label">Afficher les tablatures</span></label>
    </section>
    <section class="card set-group" aria-labelledby="s-tune"><h2 id="s-tune">Accordeur</h2>
      <div class="set-row"><div><label class="label" for="set-tuning">Accordage par défaut</label></div>
        <div class="ctl"><select id="set-tuning" class="select">${tuningsFor(instKey()).map(([k, v]) => `<option value="${k}" ${s.tuning === k ? 'selected' : ''}>${v.name} · ${v.label}</option>`).join('')}</select></div></div>
      <div class="set-row"><div><label class="label" for="set-a4">Diapason (La)</label><div class="desc">440 Hz est la référence habituelle.</div></div>
        <div class="ctl"><input id="set-a4" class="input num" type="number" min="415" max="466" step="1" value="${s.a4}" style="width:110px"><span class="muted">Hz</span></div></div>
      <div class="set-row"><div><label class="label" for="set-tol">Tolérance « Accordée »</label></div>
        <div class="ctl"><select id="set-tol" class="select">${[3, 5, 10].map((v) => `<option value="${v}" ${s.tolerance === v ? 'selected' : ''}>±${v} cents</option>`).join('')}</select></div></div>
    </section>
    <section class="card set-group" aria-labelledby="s-data"><h2 id="s-data">Sauvegarde et données</h2>
      <div class="notice ${store.lastExport ? '' : 'warn'}">${icon('info')}<p>Vos ${store.songs.length} chanson${store.songs.length > 1 ? 's' : ''} et ${store.playlists.length} playlist${store.playlists.length > 1 ? 's' : ''} sont enregistrées <strong>dans ce navigateur uniquement</strong>. Elles disparaissent si vous effacez les données de navigation ou désinstallez le navigateur. Exportez régulièrement votre bibliothèque : c’est votre copie de sécurité.<br><strong>Dernière exportation : ${store.lastExport ? esc(new Date(store.lastExport).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })) : 'jamais'}.</strong></p></div>
      <div class="row">
        <button class="btn btn-primary" data-act="exp-backup">${icon('export', 'sm')}Exporter la bibliothèque (JSON)</button>
        <button class="btn btn-soft" data-act="exp-allcho">${icon('export', 'sm')}Exporter toutes les chansons (ChordPro)</button>
        <button class="btn btn-ghost" data-act="import" data-mode="file">${icon('import', 'sm')}Importer ou restaurer</button>
      </div>
      <dl class="kv">
        <div><dt>Stockage</dt><dd>${{ idb: 'Base IndexedDB du navigateur', local: 'localStorage (mode de secours)', memory: 'aucun : les changements seront perdus à la fermeture' }[storageMode]}</dd></div>
        <div><dt>État</dt><dd>${storageOK ? 'Enregistrement fonctionnel' : 'Erreur : ' + esc(lastSaveError || 'enregistrement impossible')}</dd></div>
        <div><dt>Protection contre l’effacement automatique</dt><dd>${esc(persistState)}</dd></div>
        <div><dt>Espace utilisé</dt><dd id="set-usage" class="num">calcul…</dd></div>
      </dl>
      <div class="row">
        <button class="btn btn-ghost" data-act="clear-history" ${store.history.length ? '' : 'disabled'}>Effacer l’historique</button>
        <button class="btn btn-ghost" data-act="clear-stats" ${store.practice.sessions.length || Object.keys(store.practice.exercises).length ? '' : 'disabled'}>Effacer les statistiques</button>
        <button class="btn btn-danger-ghost" data-act="reset-all">${icon('trash', 'sm')}Effacer les données locales</button>
      </div>
    </section>
    <section class="card set-group" aria-labelledby="s-install"><h2 id="s-install">Installation et hors ligne</h2>
      <dl class="kv">
        <div><dt>Application</dt><dd>${isStandalone() || pwa.installed ? 'installée' : 'ouverte dans le navigateur'}</dd></div>
        <div><dt>Mode hors ligne</dt><dd>${esc(pwa.sw)}</dd></div>
        <div><dt>Connexion</dt><dd>${pwa.offline ? 'hors ligne' : 'en ligne'}</dd></div>
      </dl>
      ${pwa.prompt ? `<div class="row"><button class="btn btn-primary" data-act="install">${icon('import', 'sm')}Installer Harmonia sur cet appareil</button></div>`
        : isStandalone() || pwa.installed ? '' : `<p class="help">Pour installer Harmonia : sur Chrome ou Edge, utilisez l’icône d’installation dans la barre d’adresse ; sur iPhone ou iPad (Safari), touchez Partager puis « Sur l’écran d’accueil ». L’installation nécessite que l’application soit servie en https (ou localhost).</p>`}
      <div class="prose"><p><strong>Sans connexion</strong>, une fois l’application chargée une première fois : bibliothèque, lecture, transposition, diagrammes, défilement, éditeur, import et export de fichiers, répertoire libre.</p>
      <p><strong>Avec connexion uniquement</strong> : les liens « Chercher sur le web » et les bibliothèques externes, les polices de caractères au tout premier chargement (une police système les remplace sinon), et le premier import d’un PDF ou d’une image (téléchargement du module de lecture, ensuite gardé en cache). L’accordeur n’a pas besoin d’Internet, mais il exige l’autorisation du micro, qui dépend du navigateur.</p></div>
    </section>
    <section class="card set-group" aria-labelledby="s-help"><h2 id="s-help">Guide rapide</h2>
      <div class="prose">
        <details><summary><strong>Ajouter une chanson</strong></summary><p>Bibliothèque → « Nouvelle chanson ». Écrivez les accords entre crochets juste avant la syllabe : <code>Au [C]clair de la [G]lune</code>, ou collez une grille « accords au-dessus des paroles » et touchez « Convertir ». Vous pouvez aussi coller une partition copiée sur le web (Ctrl+V depuis l’accueil) ou importer un fichier.</p></details>
        <details><summary><strong>Importer un PDF ou une capture d’écran</strong></summary><p>Bibliothèque → « Importer » → « PDF ou image », ou collez directement une capture (Ctrl+V) depuis l’accueil. Harmonia lit le texte, replace les accords au-dessus des syllabes et vous montre l’aperçu avant de créer la fiche.</p></details>
        <details><summary><strong>Importer une partition pour piano</strong></summary><p>Un PDF avec symboles d’accords et paroles s’importe comme un PDF. Pour une partition sans accords écrits, convertissez-la en MusicXML (par exemple avec Audiveris, gratuit) puis importez le fichier .musicxml ou .mxl : Harmonia déduit les accords des notes, place les paroles et écrit la mélodie en tablature.</p></details>
        <details><summary><strong>Suivre sa progression</strong></summary><p>La page « Progression » résume votre temps de jeu, vos chansons les plus jouées et propose des exercices et des titres adaptés. Tout reste sur l’appareil.</p></details>
        <details><summary><strong>S’écouter pour progresser</strong></summary><p>Dans un diagramme d’accord, le haut-parleur fait entendre l’accord. Dans l’exercice « Changements en une minute » : « Écouter le modèle » joue l’enchaînement au tempo du métronome ; « Compter automatiquement » laisse Harmonia reconnaître au micro les deux accords et compter vos changements ; chaque prise peut être enregistrée puis réécoutée pour comparer avec les précédentes. Sans micro, enregistrez-vous avec le dictaphone du téléphone et choisissez « Analyser un enregistrement ».</p></details>
        <details><summary><strong>Changer d’instrument</strong></summary><p>Dans une chanson, l’accordeur ou les réglages, choisissez Guitare, Ukulélé, Mandoline, Basse ou Piano : diagrammes d’accords, tablatures et accordeur s’adaptent aussitôt.</p></details>
        <details><summary><strong>Jouer une chanson</strong></summary><p>Touchez un accord pour voir son diagramme (épingle : garder le panneau ouvert). « − » et « + » transposent d’un demi-ton. La barre du bas lance le défilement automatique ; Espace met en pause, ← et → règlent la vitesse.</p></details>
        <details><summary><strong>Accorder la guitare</strong></summary><p>Accordeur → « Démarrer le micro », autorisez l’accès, puis jouez une corde à la fois. L’aiguille au centre et le message « Accordée » en vert indiquent que la corde est juste.</p></details>
        <details><summary><strong>Sauvegarder et restaurer</strong></summary><p>Réglages → « Exporter la bibliothèque » crée un fichier JSON. Pour restaurer : « Importer ou restaurer », choisissez ce fichier, puis « Fusionner » (rien n’est supprimé) ou « Remplacer tout ».</p></details>
      </div>
    </section>
    <section class="card set-group" aria-labelledby="s-priv"><h2 id="s-priv">Confidentialité</h2>
      <div class="prose"><ul>
        <li>Aucun compte, aucun serveur Harmonia : vos chansons, playlists et réglages restent dans ce navigateur. Rien n’est envoyé sans action de votre part.</li>
        <li>Le micro n’est utilisé que dans l’accordeur et dans les exercices, après votre autorisation. Le son est analysé sur l’appareil et jamais transmis ; il n’est enregistré que si vous cochez « Enregistrer ma prise », et la prise reste sur cet appareil (supprimable à tout moment).</li>
        <li>Aucune publicité, aucun traceur, aucune statistique d’usage, aucune fonction payante.</li>
        <li>Seules les polices de caractères sont chargées depuis Internet (Google Fonts), sans cookie de suivi de la part d’Harmonia.</li>
      </ul></div>
    </section>
    <section class="card set-group" aria-labelledby="s-about"><h2 id="s-about">Limites connues</h2>
      <div class="prose"><ul>
        <li>Pas de catalogue en ligne ni d’import automatique depuis les sites de partitions : aucune source légale avec accès autorisé n’est disponible. Utilisez « Chercher sur le web » puis le collage intelligent, ou le répertoire libre intégré (${CATALOG.length} chansons du domaine public, sans connexion).</li>
        <li>La reconnaissance des accords au micro compare ce qu’elle entend aux deux accords de l’exercice : elle peut manquer un changement trop bref ou être gênée par le bruit ; « +1 » reste disponible. Le son des accords est synthétisé et reste une approximation de l’instrument.</li>
        <li>Le défilement automatique suit la vitesse que vous réglez. Il n’écoute pas la musique et ne suit pas les paroles.</li>
        <li>Les diagrammes couvrent les accords majeurs, mineurs, 7, m7, maj7, sus2, sus4, 7sus4, dim, dim7, aug, add9, 6, m6, 9 et 5. Les autres accords sont transposés mais affichés sans diagramme.</li>
        <li>Pas de synchronisation entre appareils : utilisez l’export et l’import pour transférer votre bibliothèque.</li>
        <li>Partitions : les notes dessinées sur une portée ne sont pas lues dans un PDF ou une image ; seuls le texte, les symboles d’accords et les tablatures en texte le sont. Pour les notes, passez par le format MusicXML. Les accords déduits d’une partition MusicXML résument l’harmonie de chaque mesure ou demi-mesure.</li>
        <li>Lecture des PDF et des images : la reconnaissance de texte peut confondre des accords (« C » et « G », « Am » et « Arn »…) ; vérifiez l’aperçu. Les partitions en notation musicale (portées, notes) ne sont pas converties : seuls le texte, les accords et les tablatures en texte sont lus.</li>
        <li>Instruments autres que la guitare : les positions sont calculées à partir des notes de l’accord et vérifiées automatiquement ; les tablatures de guitare sont converties note à note, sans les techniques de jeu.</li>
        <li>Dans l’aperçu intégré à Claude, le micro et le mode hors ligne sont bloqués : l’accordeur et le comptage automatique au micro demandent la version installée ou servie en https. Sans micro, l’analyse d’un enregistrement (accordeur et exercices) et l’écoute des accords fonctionnent partout.</li>
      </ul><p class="muted" style="font-size:13px">Harmonia 1.0 — Mon carnet musical · gratuit, sans publicité, sans abonnement</p></div>
    </section>
  </div>`;
}


async function afterSettings() {
  const el = $('#set-usage');
  const e = await storageEstimate();
  if (el) el.textContent = e ? `${fmtNum(e.usage / 1048576, 1)} Mo${e.quota ? ` sur ${fmtNum(e.quota / 1073741824, 1)} Go disponibles` : ''}` : 'non communiqué par le navigateur';
}
