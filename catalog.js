/* Harmonia — chansons de démonstration et répertoire libre */
'use strict';
/* Chansons de démonstration et répertoire libre de droits */
const EXAMPLES = [
  {
    catalogId: 'amazing-grace', tags: ['Spirituels', 'Folk anglophone'], title: 'Amazing Grace', artist: 'John Newton (1779), traditionnel', key: 'G', capo: '', difficulty: 'Débutant', structure: 'Couplet ×3',
    body: `{start_of_verse: Couplet 1}
A[G]mazing [G7]grace, how [C]sweet the [G/B]sound
That [G]saved a wretch like [D]me.
I [G]once was [G7]lost, but [C]now am [G]found,
Was [Em]blind, but [D7]now I [G]see.
{end_of_verse}

{start_of_verse: Couplet 2}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear,
And [G]grace my fears re[D]lieved;
How [G]precious [G7]did that [C]grace ap[G]pear
The [Em]hour I [D7]first be[G]lieved.
{end_of_verse}

{start_of_verse: Couplet 3}
Through [G]many [G7]dangers, [C]toils and [G]snares,
I [G]have already [D]come;
'Tis [G]grace hath [G7]brought me [C]safe thus [G]far,
And [Em]grace will [D7]lead me [G]home.
{end_of_verse}`,
    notes: 'Mesure à 3 temps. Arpéger doucement : basse, puis cordes aiguës.\nExemple fourni avec Harmonia (texte du domaine public).'
  },
  {
    catalogId: 'claire-fontaine', tags: ['Traditionnel français'], title: 'À la claire fontaine', artist: 'Chanson traditionnelle', key: 'D', capo: '2', difficulty: 'Débutant', structure: 'Couplet – Refrain',
    body: `{start_of_verse: Couplet 1}
À la [D]claire fon[A]taine, m'en al[A7]lant prome[D]ner,
J'ai trouvé l'eau si [A]belle que je m'y suis bai[D]gné.
{end_of_verse}

{start_of_chorus}
Il y a [G]longtemps que je [D]t'aime,
Ja[Bm]mais je ne t'ou[A7]blie[D]rai.
{end_of_chorus}

{start_of_verse: Couplet 2}
Sous les [D]feuilles d'un [A]chêne, je me [A7]suis fait sé[D]cher,
Sur la plus haute [A]branche, le rossi[A7]gnol chan[D]tait.
{end_of_verse}

{start_of_chorus}
{end_of_chorus}`,
    notes: 'Avec le capo en case 2, la chanson sonne en Mi.\nExemple fourni avec Harmonia (texte du domaine public).'
  },
  {
    catalogId: 'scarborough-fair', tags: ['Folk anglophone'], title: 'Scarborough Fair', artist: 'Ballade anglaise traditionnelle', key: 'Am', capo: '', difficulty: 'Intermédiaire', structure: 'Intro – Couplets',
    body: `{comment: Introduction}
[Am] [G] [Am]

{start_of_tab: Motif d'introduction}
e|-----------------|-----------------|-----------------|
B|-----1-------1---|-----0-------0---|-----1h3p1-------|
G|-------2-------2-|-------0-------0-|-----------2-----|
D|---2-------2-----|---0-------0-----|---2-------------|
A|-0-------0-------|-----------------|-0---------------|
E|-----------------|-3-------3-------|-----------------|
{end_of_tab}

{start_of_verse: Couplet 1}
[Am]Are you going to [G]Scarborough [Am]Fair?
[C]Parsley, [Am]sage, rose[D]mary and [Am]thyme,
Re[Am]member [C]me to one who lives [G]there,
[Am]She once was a [G]true love of [Am]mine.
{end_of_verse}

{start_of_verse: Couplet 2}
[Am]Tell her to make me a [G]cambric [Am]shirt,
[C]Parsley, [Am]sage, rose[D]mary and [Am]thyme,
With[Am]out no [C]seams nor needle[G]work,
[Am]Then she'll be a [G]true love of [Am]mine.
{end_of_verse}`,
    notes: 'Mesure à 3 temps. Motif d’introduction composé pour cet exemple.\nExemple fourni avec Harmonia (texte du domaine public).'
  },
  {
    catalogId: 'clair-lune', tags: ['Comptines'], title: 'Au clair de la lune', artist: 'Chanson traditionnelle', key: 'C', capo: '', difficulty: 'Débutant', structure: 'A – A – B – A',
    body: `{start_of_verse: Couplet}
[C]Au clair de la [G]lune, [C]mon ami Pier[G]rot,
[C]Prête-moi ta [G]plume [C]pour é[G]crire un [C]mot.
[Dm]Ma chandelle est [Am]morte, [Dm]je n'ai plus de [G]feu,
[C]Ouvre-moi ta [G]porte [C]pour l'a[G]mour de [C]Dieu.
{end_of_verse}`,
    notes: 'Idéal pour travailler le passage Do – Sol.\nExemple fourni avec Harmonia (texte du domaine public).'
  }
];

/* ---------- Répertoire libre : paroles du domaine public, accords arrangés pour Harmonia ---------- */
const CAT_NOTE = 'Paroles du domaine public. Accords : arrangement simple proposé par Harmonia.';
const MORE_CATALOG = [
  { id: 'frere-jacques', title: 'Frère Jacques', artist: 'Comptine traditionnelle', key: 'G', difficulty: 'Débutant', tags: ['Comptines'], structure: 'Se chante en canon',
    body: `[G]Frère Jacques, [D]frère [G]Jacques,
[G]Dormez-vous ? [D]Dormez-[G]vous ?
[G]Sonnez les matines, [D]sonnez les ma[G]tines,
[G]Ding, daing, [D]dong. [G]Ding, daing, [D]dong[G].` },
  { id: 'pont-avignon', title: 'Sur le pont d’Avignon', artist: 'Chanson traditionnelle', key: 'G', difficulty: 'Débutant', tags: ['Comptines'], structure: 'Refrain – Couplet – Refrain',
    body: `{start_of_chorus}
Sur le [G]pont d'Avi[D]gnon,
L'on y [G]danse, l'on y [D]danse,
Sur le [G]pont d'Avi[D]gnon,
L'on y [G]danse [D]tous en [G]rond.
{end_of_chorus}

{start_of_verse: Couplet 1}
Les beaux [D]messieurs font comme [G]ça,
Et puis en[D]core comme [G]ça.
{end_of_verse}

{comment: Refrain}

{start_of_verse: Couplet 2}
Les belles [D]dames font comme [G]ça,
Et puis en[D]core comme [G]ça.
{end_of_verse}

{comment: Refrain}` },
  { id: 'alouette', title: 'Alouette', artist: 'Chanson traditionnelle', key: 'D', difficulty: 'Débutant', tags: ['Comptines'], structure: 'Refrain – Couplets cumulatifs',
    body: `{start_of_chorus}
A[D]louette, gentille a[A]louette,
A[A]louette, je te plume[D]rai.
{end_of_chorus}

{start_of_verse: Couplet 1}
Je te plumerai la [D]tête, je te plumerai la [A]tête,
Et la [D]tête, et la [A]tête, a[D]louette, a[A]louette, ô-ô-ô-[D]ô.
{end_of_verse}

{start_of_verse: Couplet 2}
Je te plumerai le [D]bec, je te plumerai le [A]bec,
Et le [D]bec, et le bec, et la [A]tête, et la tête, a[D]louette, a[A]louette, ô-ô-ô-[D]ô.
{end_of_verse}` },
  { id: 'bon-tabac', title: 'J’ai du bon tabac', artist: 'Chanson traditionnelle', key: 'G', difficulty: 'Débutant', tags: ['Comptines'], structure: 'A – B – A',
    body: `J'ai du bon ta[G]bac dans ma taba[D]tière,
J'ai du bon ta[G]bac, tu n'en au[D]ras [G]pas.
J'en ai du [D]fin et du bien râ[G]pé,
Mais ce n'est [D]pas pour ton vilain [G]nez.
J'ai du bon ta[G]bac dans ma taba[D]tière,
J'ai du bon ta[G]bac, tu n'en au[D]ras [G]pas.` },
  { id: 'petit-navire', title: 'Il était un petit navire', artist: 'Chanson traditionnelle', key: 'C', difficulty: 'Débutant', tags: ['Comptines', 'Chants de marins'], structure: 'Couplet – Refrain',
    body: `{start_of_verse: Couplet 1}
Il [C]était un petit na[G]vire, il [G]était un petit na[C]vire,
Qui n'a[C]vait ja-ja-ja[F]mais navi[C]gué, qui n'a[G]vait ja-ja-jamais navi[C]gué.
{end_of_verse}

{start_of_chorus}
O[C]hé ! O[G]hé ! Mate[C]lot, mate[F]lot navigue sur les [C]flots,
O[C]hé ! O[G]hé ! Mate[C]lot, mate[G]lot navigue sur les [C]flots.
{end_of_chorus}

{start_of_verse: Couplet 2}
Il [C]partit pour un long vo[G]yage, il [G]partit pour un long vo[C]yage,
Sur la [C]mer Mé-Mé-Médi[F]terra[C]née, sur la [G]mer Mé-Mé-Méditerra[C]née.
{end_of_verse}

{comment: Refrain}` },
  { id: 'aupres-blonde', title: 'Auprès de ma blonde', artist: 'Chanson traditionnelle', key: 'D', difficulty: 'Débutant', tags: ['Traditionnel français'], structure: 'Couplet – Refrain',
    body: `{start_of_verse: Couplet 1}
Au jar[D]din de mon [A]père, les lau[A7]riers sont fleu[D]ris,
Tous les oi[D]seaux du [A]monde vont y [A7]faire leurs [D]nids.
{end_of_verse}

{start_of_chorus}
Au[G]près de ma [D]blonde, qu'il fait [A]bon, fait bon, fait [D]bon,
Au[G]près de ma [D]blonde, qu'il fait [A7]bon dor[D]mir !
{end_of_chorus}

{start_of_verse: Couplet 2}
La [D]caille, la tourte[A]relle, et la [A7]jolie per[D]drix,
Et ma jo[D]lie co[A]lombe qui [A7]chante jour et [D]nuit.
{end_of_verse}

{comment: Refrain}` },
  { id: 'cadet-rousselle', title: 'Cadet Rousselle', artist: 'Chanson traditionnelle', key: 'G', difficulty: 'Débutant', tags: ['Comptines'], structure: 'Couplet – Refrain',
    body: `{start_of_verse: Couplet 1}
Cadet Rous[G]selle a trois mai[D]sons, (bis)
Qui n'ont ni [G]poutres ni che[D]vrons, (bis)
C'est pour lo[G]ger les hiron[C]delles,
Que direz-[G]vous d'Cadet Rous[D]selle ?
{end_of_verse}

{start_of_chorus}
Ah ! Ah ! [G]Ah ! Oui [C]vraiment,
Cadet Rous[G]selle est [D]bon en[G]fant !
{end_of_chorus}` },
  { id: 'roi-dagobert', title: 'Le bon roi Dagobert', artist: 'Chanson traditionnelle', key: 'C', difficulty: 'Débutant', tags: ['Comptines'], structure: 'Couplet',
    body: `Le [C]bon roi Dago[G]bert
A mis sa [C]culotte à l'en[G]vers ;
Le grand [C]saint É[F]loi
Lui [C]dit : « Ô mon [G]roi !
Votre Ma[C]jes[F]té
Est mal cu[G]lot[C]tée. »
« C'est [C]vrai, lui dit le [G]roi,
Je vais la re[G]mettre à l'en[C]droit. »` },
  { id: 'meunier', title: 'Meunier, tu dors', artist: 'Chanson traditionnelle', key: 'C', difficulty: 'Débutant', tags: ['Comptines'], structure: 'A – B',
    body: `Meu[C]nier, tu dors, ton mou[G]lin, ton moulin va trop [C]vite,
Meu[C]nier, tu dors, ton mou[G]lin, ton moulin va trop [C]fort.
Ton mou[G]lin, ton moulin va trop [C]vite,
Ton mou[G]lin, ton moulin va trop [C]fort.` },
  { id: 'il-pleut-bergere', title: 'Il pleut, bergère', artist: 'Fabre d’Églantine (1780)', key: 'G', difficulty: 'Débutant', tags: ['Traditionnel français'], structure: 'Couplet',
    body: `Il [G]pleut, il pleut, ber[D]gère, presse tes [G]blancs mou[D]tons,
Al[G]lons sous ma chau[D]mière, ber[G]gère, [D]vite, al[G]lons.
J'en[C]tends sur le feuil[G]lage l'eau qui [D]tombe à grand [G]bruit ;
Voi[C]ci, voici l'o[G]rage, voi[D]là l'éclair qui [G]luit.` },
  { id: 'temps-cerises', title: 'Le Temps des cerises', artist: 'Jean-Baptiste Clément, Antoine Renard (1868)', key: 'C', difficulty: 'Intermédiaire', tags: ['Traditionnel français'], structure: 'Couplets',
    body: `{start_of_verse: Couplet 1}
Quand nous chan[C]terons le temps des ce[G]rises,
Et gai rossi[G7]gnol et merle mo[C]queur
Seront tous en [F]fête !
Les belles au[C]ront la folie en [G]tête
Et les amou[G7]reux du soleil au [C]cœur !
Quand nous chan[C]terons le temps des ce[F]rises,
Sifflera bien [C]mieux le [G7]merle mo[C]queur !
{end_of_verse}

{start_of_verse: Couplet 2}
Mais il est bien [C]court le temps des ce[G]rises
Où l'on s'en va [G7]deux cueillir en rê[C]vant
Des pendants d'o[F]reilles…
Cerises d'a[C]mour aux robes pa[G]reilles,
Tombant sous la [G7]feuille en gouttes de [C]sang…
Mais il est bien [C]court le temps des ce[F]rises,
Pendants de co[C]rail qu'on [G7]cueille en rê[C]vant !
{end_of_verse}` },
  { id: 'plaisir-amour', title: 'Plaisir d’amour', artist: 'Florian, Martini (1784)', key: 'C', difficulty: 'Intermédiaire', tags: ['Traditionnel français'], structure: 'Refrain – Couplet – Refrain',
    body: `{start_of_chorus}
Plai[C]sir d'a[G]mour ne [C]dure qu'un mo[G]ment,
Cha[C]grin d'a[F]mour dure [C]toute la [G]vi[C]e.
{end_of_chorus}

{start_of_verse: Couplet}
J'ai [C]tout quit[G]té pour l'in[C]grate Syl[G]vie,
Elle me [C]quitte et [F]prend un [G]autre a[C]mant.
{end_of_verse}

{comment: Refrain}` },
  { id: 'oh-susanna', title: 'Oh! Susanna', artist: 'Stephen Foster (1848)', key: 'C', difficulty: 'Débutant', tags: ['Folk anglophone'], structure: 'Couplet – Refrain',
    body: `{start_of_verse: Couplet 1}
I [C]come from Alabama with my [G]banjo on my knee,
I'm [C]going to Louisiana, my [G]true love for to [C]see.
{end_of_verse}

{start_of_chorus}
[F]Oh! Susanna, [C]oh don't you cry for [G]me,
For I [C]come from Alabama with my [G]banjo on my [C]knee.
{end_of_chorus}

{start_of_verse: Couplet 2}
It [C]rained all night the day I left, the [G]weather it was dry,
The [C]sun so hot I froze to death; Su[G]sanna, don't you [C]cry.
{end_of_verse}

{comment: Refrain}` },
  { id: 'clementine', title: 'Oh My Darling, Clementine', artist: 'Percy Montrose (1884)', key: 'G', difficulty: 'Débutant', tags: ['Folk anglophone'], structure: 'Couplet – Refrain · mesure à 3 temps',
    body: `{start_of_verse: Couplet 1}
In a [G]cavern, in a canyon,
Excavating for a [D]mine,
Dwelt a [D]miner forty-niner,
And his [D7]daughter Clemen[G]tine.
{end_of_verse}

{start_of_chorus}
Oh my [G]darling, oh my darling,
Oh my darling, Clemen[D]tine!
You are [D]lost and gone forever,
Dreadful [D7]sorry, Clemen[G]tine.
{end_of_chorus}

{start_of_verse: Couplet 2}
Light she [G]was and like a fairy,
And her shoes were number [D]nine,
Herring [D]boxes, without topses,
Sandals [D7]were for Clemen[G]tine.
{end_of_verse}

{comment: Refrain}` },
  { id: 'red-river', title: 'Red River Valley', artist: 'Chanson traditionnelle nord-américaine', key: 'G', difficulty: 'Débutant', tags: ['Folk anglophone'], structure: 'Couplet – Refrain',
    body: `{start_of_verse: Couplet}
From this [G]valley they say you are going,
We will miss your bright [D]eyes and sweet smile,
For they [G]say you are taking the [C]sunshine
That has [D]brightened our pathway a [G]while.
{end_of_verse}

{start_of_chorus}
Come and [G]sit by my side if you love me,
Do not hasten to [D]bid me adieu,
But re[G]member the Red River [C]Valley,
And the [D]one who has loved you so [G]true.
{end_of_chorus}` },
  { id: 'home-range', title: 'Home on the Range', artist: 'Brewster Higley, Daniel Kelley (1873)', key: 'G', difficulty: 'Débutant', tags: ['Folk anglophone'], structure: 'Couplet – Refrain · mesure à 3 temps',
    body: `{start_of_verse: Couplet}
Oh, give [G]me a home where the [C]buffalo roam,
Where the [G]deer and the antelope [D]play,
Where [G]seldom is heard a dis[C]couraging word,
And the [G]skies are [D]not cloudy all [G]day.
{end_of_verse}

{start_of_chorus}
[D]Home, [G]home on the [C]range,
Where the [G]deer and the antelope [D]play,
Where [G]seldom is heard a dis[C]couraging word,
And the [G]skies are [D]not cloudy all [G]day.
{end_of_chorus}` },
  { id: 'shenandoah', title: 'Shenandoah', artist: 'Chant de marins traditionnel', key: 'C', difficulty: 'Intermédiaire', tags: ['Chants de marins', 'Folk anglophone'], structure: 'Couplets',
    body: `{start_of_verse: Couplet 1}
[C]Oh Shenan[F]doah, [C]I long to [Am]see you,
[F]Away, you [C]rolling [Am]river,
Oh [G]Shenan[C]doah, I [Am]long to see [Em]you,
A[Am]way, I'm [G]bound a[C]way, 'cross the [F]wide [G]Mis[C]souri.
{end_of_verse}

{start_of_verse: Couplet 2}
[C]Oh Shenan[F]doah, [C]I love your [Am]daughter,
[F]Away, you [C]rolling [Am]river,
For [G]her I'd [C]cross your [Am]roaming [Em]waters,
A[Am]way, I'm [G]bound a[C]way, 'cross the [F]wide [G]Mis[C]souri.
{end_of_verse}` },
  { id: 'drunken-sailor', title: 'What Shall We Do with the Drunken Sailor', artist: 'Chant de marins traditionnel', key: 'Dm', difficulty: 'Débutant', tags: ['Chants de marins'], structure: 'Couplet – Refrain',
    body: `{start_of_verse: Couplet 1}
[Dm]What shall we do with a drunken sailor,
[C]What shall we do with a drunken sailor,
[Dm]What shall we do with a drunken sailor,
[F]Early [C]in the [Dm]morning?
{end_of_verse}

{start_of_chorus}
[Dm]Way hay and up she rises,
[C]Way hay and up she rises,
[Dm]Way hay and up she rises,
[F]Early [C]in the [Dm]morning.
{end_of_chorus}

{start_of_verse: Couplet 2}
[Dm]Put him in the long boat till he's sober,
[C]Put him in the long boat till he's sober,
[Dm]Put him in the long boat till he's sober,
[F]Early [C]in the [Dm]morning.
{end_of_verse}

{comment: Refrain}` },
  { id: 'greensleeves', title: 'Greensleeves', artist: 'Ballade anglaise traditionnelle', key: 'Am', difficulty: 'Intermédiaire', tags: ['Folk anglophone'], structure: 'Couplet – Refrain · mesure à 3 temps',
    body: `{start_of_verse: Couplet}
A[Am]las, my [G]love, you [Am]do me [E]wrong,
To [Am]cast me [G]off dis[Am]court[E]eous[Am]ly.
For [Am]I have [G]loved you [Am]well and [E]long,
De[Am]light[G]ing [Am]in your [E]compa[Am]ny.
{end_of_verse}

{start_of_chorus}
[C]Greensleeves was [G]all my [Am]joy,
And [Em]Greensleeves was my de[Am]light, [E]
[C]Greensleeves was my [G]heart of [Am]gold,
And [E]who but my [Am]lady [E]Greensleeves[Am].
{end_of_chorus}` },
  { id: 'saints', title: 'When the Saints Go Marching In', artist: 'Spiritual traditionnel', key: 'G', difficulty: 'Débutant', tags: ['Spirituels', 'Folk anglophone'], structure: 'Couplets',
    body: `{start_of_verse: Couplet 1}
Oh when the [G]saints go marching in,
Oh when the saints go marching [D]in,
Oh Lord, I [G]want to [G7]be in that [C]number,
When the [G]saints go [D]marching [G]in.
{end_of_verse}

{start_of_verse: Couplet 2}
Oh when the [G]sun refuse to shine,
Oh when the sun refuse to [D]shine,
Oh Lord, I [G]want to [G7]be in that [C]number,
When the [G]sun re[D]fuse to [G]shine.
{end_of_verse}` },
  { id: 'swing-low', title: 'Swing Low, Sweet Chariot', artist: 'Spiritual traditionnel', key: 'D', difficulty: 'Débutant', tags: ['Spirituels'], structure: 'Refrain – Couplet',
    body: `{start_of_chorus}
Swing [D]low, sweet [G]chari[D]ot,
Coming for to carry me [A]home,
Swing [D]low, sweet [G]chari[D]ot,
Coming for to [A]carry me [D]home.
{end_of_chorus}

{start_of_verse: Couplet}
I [D]looked over Jordan, and [G]what did I [D]see,
Coming for to carry me [A]home?
A [D]band of angels [G]coming after [D]me,
Coming for to [A]carry me [D]home.
{end_of_verse}

{comment: Refrain}` },
  { id: 'auld-lang-syne', title: 'Auld Lang Syne', artist: 'Robert Burns (1788)', key: 'G', difficulty: 'Débutant', tags: ['Folk anglophone'], structure: 'Couplet – Refrain',
    body: `{start_of_verse: Couplet}
Should [G]auld acquaintance [D]be for[G]got,
And [G7]never brought to [C]mind?
Should [G]auld acquaintance [D]be for[G]got,
And [Em]auld [C]lang [D]sy[G]ne?
{end_of_verse}

{start_of_chorus}
For [G]auld lang syne, my [D]dear,
For [G]auld lang [G7]syne,
We'll [C]tak a cup o' [G]kindness yet,
For [Em]auld [C]lang [D]sy[G]ne.
{end_of_chorus}` },
  { id: 'ode-joie', title: 'Ode à la joie', artist: 'Ludwig van Beethoven (1824)', key: 'C', difficulty: 'Débutant', tags: ['Tablatures'], structure: 'Mélodie en tablature – Accompagnement',
    body: `{comment: Mélodie (tablature, cordes de Mi aigu et de Si)}
{start_of_tab}
e|-0--0--1--3--|-3--1--0-----|----------0--|-0--------|
B|-------------|----------3--|-1--1--3-----|----3--3--|
G|-------------|-------------|-------------|----------|
D|-------------|-------------|-------------|----------|
A|-------------|-------------|-------------|----------|
E|-------------|-------------|-------------|----------|

e|-0--0--1--3--|-3--1--0-----|----------0--|----------|
B|-------------|----------3--|-1--1--3-----|-3--1--1--|
G|-------------|-------------|-------------|----------|
D|-------------|-------------|-------------|----------|
A|-------------|-------------|-------------|----------|
E|-------------|-------------|-------------|----------|

e|-------0-----|----0--1--0-----|----0--1--0-----|----------|
B|-3--3-----1--|-3-----------1--|-3-----------3--|-1--3-----|
G|-------------|----------------|----------------|-------0--|
D|-------------|----------------|----------------|----------|
A|-------------|----------------|----------------|----------|
E|-------------|----------------|----------------|----------|

e|-0--0--1--3--|-3--1--0-----|----------0--|----------|
B|-------------|----------3--|-1--1--3-----|-3--1--1--|
G|-------------|-------------|-------------|----------|
D|-------------|-------------|-------------|----------|
A|-------------|-------------|-------------|----------|
E|-------------|-------------|-------------|----------|
{end_of_tab}

{comment: Accompagnement (une mesure par accord)}
{comment: Mesures 1 à 8}
[C]  [G]  [C]  [G]  [C]  [G]  [C]  [G] [C]
{comment: Mesures 9 à 16}
[G]  [C]  [G]  [C]  [G]  [C]  [G]  [C]  [G] [C]`,
    notes: 'Thème de la 9e symphonie. Jouez la mélodie avec l’index sur la case 1 et l’annulaire sur la case 3.\nTablature écrite pour Harmonia (œuvre du domaine public).' },
  { id: 'frere-jacques-tab', title: 'Frère Jacques (mélodie)', artist: 'Comptine traditionnelle', key: 'G', difficulty: 'Débutant', tags: ['Tablatures', 'Comptines'], structure: 'Mélodie en tablature',
    body: `{comment: Mélodie (tablature)}
{start_of_tab}
e|-------------|-------------|----------|----------|
B|-------0-----|-------0-----|-0--1--3--|-0--1--3--|
G|-0--2-----0--|-0--2-----0--|----------|----------|
D|-------------|-------------|----------|----------|
A|-------------|-------------|----------|----------|
E|-------------|-------------|----------|----------|

e|----0--------------|----0--------------|----------|----------|
B|-3-----3--1--0-----|-3-----3--1--0-----|----------|----------|
G|----------------0--|----------------0--|-0-----0--|-0-----0--|
D|-------------------|-------------------|----0-----|----0-----|
A|-------------------|-------------------|----------|----------|
E|-------------------|-------------------|----------|----------|
{end_of_tab}

{comment: Paroles}
Frère Jacques, frère Jacques, dormez-vous ? Dormez-vous ?
Sonnez les matines, sonnez les matines, ding, daing, dong. Ding, daing, dong.`,
    notes: 'Deux mesures par phrase des paroles. Peut se jouer en canon à deux guitares.\nTablature écrite pour Harmonia (œuvre du domaine public).' },
  { id: 'romance-anonyme', title: 'Romance (introduction)', artist: 'Anonyme, XIXe siècle', key: 'Em', difficulty: 'Intermédiaire', tags: ['Tablatures'], structure: 'Arpèges en triolets',
    body: `{comment: Introduction (4 mesures, arpèges en triolets)}
[Em] [Em] [Em] [Em]
{start_of_tab}
e|-7--------7--------7--------|-7--------5--------3--------|
B|----0--------0--------0-----|----0--------0--------0-----|
G|-------0--------0--------0--|-------0--------0--------0--|
D|----------------------------|----------------------------|
A|----------------------------|----------------------------|
E|-0--------0--------0--------|-0--------0--------0--------|

e|-3--------2--------0--------|-0--------3--------7--------|
B|----0--------0--------0-----|----0--------0--------0-----|
G|-------0--------0--------0--|-------0--------0--------0--|
D|----------------------------|----------------------------|
A|----------------------------|----------------------------|
E|-0--------0--------0--------|-0--------0--------0--------|
{end_of_tab}`,
    notes: 'Mélodie sur la 1re corde (annulaire), cordes de Si et de Sol à vide, Mi grave à vide en basse. Gardez les triolets réguliers.\nTablature simplifiée écrite pour Harmonia (œuvre du domaine public).' },
  { id: 'clair-lune-tab', title: 'Au clair de la lune (mélodie)', artist: 'Chanson traditionnelle', key: 'C', difficulty: 'Débutant', tags: ['Tablatures', 'Comptines'], structure: 'A – A – B – A',
    body: `{comment: Mélodie (tablature)}
{start_of_tab}
e|-------------|-0-----|----0--------|----|
B|-1--1--1--3--|----3--|-1-----3--3--|-1--|
G|-------------|-------|-------------|----|
D|-------------|-------|-------------|----|
A|-------------|-------|-------------|----|
E|-------------|-------|-------------|----|

e|-------------|-0-----|----0--------|----|
B|-1--1--1--3--|----3--|-1-----3--3--|-1--|
G|-------------|-------|-------------|----|
D|-------------|-------|-------------|----|
A|-------------|-------|-------------|----|
E|-------------|-------|-------------|----|

e|-------------|-------|-------------|----|
B|-3--3--3--3--|-------|-3--1--0-----|----|
G|-------------|-2--2--|----------2--|-0--|
D|-------------|-------|-------------|----|
A|-------------|-------|-------------|----|
E|-------------|-------|-------------|----|

e|-------------|-0-----|----0--------|----|
B|-1--1--1--3--|----3--|-1-----3--3--|-1--|
G|-------------|-------|-------------|----|
D|-------------|-------|-------------|----|
A|-------------|-------|-------------|----|
E|-------------|-------|-------------|----|
{end_of_tab}`,
    notes: 'Quatre mesures par vers. Accords d’accompagnement dans la fiche « Au clair de la lune ».\nTablature écrite pour Harmonia (œuvre du domaine public).' }
];
const CATALOG = EXAMPLES.map((e) => ({ ...e, id: e.catalogId })).concat(MORE_CATALOG);
const CAT_TAGS = ['Tablatures', 'Traditionnel français', 'Comptines', 'Folk anglophone', 'Chants de marins', 'Spirituels'];
const FREE_LIBRARIES = [
  { name: 'Wikisource', url: 'https://fr.wikisource.org/', desc: 'Textes du domaine public, dont des recueils de chansons anciennes.' },
  { name: 'IMSLP', url: 'https://imslp.org/', desc: 'Bibliothèque de partitions du domaine public, surtout classiques (PDF).' },
  { name: 'Mutopia', url: 'https://www.mutopiaproject.org/', desc: 'Partitions classiques sous licence libre, avec une section guitare.' }
];

