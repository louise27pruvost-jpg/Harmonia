/* ===================================================================
   Données : modèle, validation et persistance locale
   - Bibliothèque (chansons, playlists, historique) : IndexedDB
   - Préférences simples : localStorage (copie de secours dans IndexedDB)
   - Repli : localStorage complet, puis mémoire seule (signalé à l'utilisateur)
   =================================================================== */
const DB_NAME = 'harmonia';
const DB_VERSION = 1;
const LS_SETTINGS = 'harmonia:settings:v1';
const LS_LEGACY = 'harmonia:data:v1'; // ancien format (versions 1.0 à 1.3), migré automatiquement

const DEFAULT_SETTINGS = {
  theme: 'light', textScale: 1, scrollSpeed: 1, accidentals: 'auto', showTabs: true,
  tuning: 'standard', instrument: 'guitare', a4: 440, tolerance: 5, reduceMotion: false, contrast: false, colors: { preset: 'prune' }, trackPractice: true
};
const LIMITS = { title: 200, artist: 200, key: 8, structure: 300, body: 200000, tab: 100000, notes: 20000 };

/* ---------- Modèle et validation ---------- */
const str = (v, max) => String(v ?? '').slice(0, max);
function makeSong(d, source = 'manual') {
  const now = Date.now();
  const t = Number(d.transpose);
  return {
    id: typeof d.id === 'string' && d.id ? d.id.slice(0, 64) : uid(),
    title: str(d.title, LIMITS.title).trim() || 'Sans titre',
    artist: str(d.artist, LIMITS.artist).trim(),
    key: str(d.key, LIMITS.key).trim(),
    capo: /^\d{1,2}$/.test(String(d.capo ?? '').trim()) ? String(Number(d.capo)) : '',
    difficulty: str(d.difficulty, 40).trim(),
    structure: str(d.structure, LIMITS.structure).trim(),
    body: str(d.body, LIMITS.body), tab: str(d.tab, LIMITS.tab), notes: str(d.notes, LIMITS.notes),
    source: ['manual', 'import', 'example', 'catalog'].includes(d.source) ? d.source : source,
    catalogId: typeof d.catalogId === 'string' ? d.catalogId : null,
    fav: !!d.fav,
    transpose: Number.isInteger(t) ? clamp(t, -11, 11) : 0,
    createdAt: Number(d.createdAt) || now, updatedAt: Number(d.updatedAt) || now, lastOpened: Number(d.lastOpened) || 0
  };
}
function cleanSettings(s) {
  const o = { ...DEFAULT_SETTINGS, ...(s && typeof s === 'object' ? s : {}) };
  if (!['light', 'dark', 'system'].includes(o.theme)) o.theme = 'light';
  if (!['auto', 'sharps', 'flats'].includes(o.accidentals)) o.accidentals = 'auto';
  if (!['guitare', 'ukulele', 'mandoline', 'basse', 'piano'].includes(o.instrument)) o.instrument = 'guitare';
  const tunings = typeof TUNINGS !== 'undefined' ? TUNINGS : null;
  if (tunings && (!tunings[o.tuning] || (tunings[o.tuning].inst !== o.instrument && tunings[o.tuning].inst !== '*'))) o.tuning = typeof INSTRUMENTS !== 'undefined' ? INSTRUMENTS[o.instrument].defaultTuning : 'standard';
  if (!tunings && !['standard', 'dstandard', 'dropd', 'chromatic'].includes(o.tuning)) o.tuning = 'standard';
  o.textScale = clamp(Number(o.textScale) || 1, 0.8, 1.6);
  o.scrollSpeed = clamp(Number(o.scrollSpeed) || 1, 0.25, 3);
  o.a4 = clamp(Math.round(Number(o.a4) || 440), 415, 466);
  o.tolerance = [3, 5, 10].includes(Number(o.tolerance)) ? Number(o.tolerance) : 5;
  ['showTabs', 'reduceMotion', 'contrast', 'trackPractice'].forEach((k) => { o[k] = !!o[k]; });
  o.colors = typeof cleanColors === 'function' ? cleanColors(o.colors) : { preset: 'prune' };
  return o;
}
function freshStore() {
  return {
    version: 1, songs: EXAMPLES.map((e, i) => makeSong({ ...e, source: 'example', createdAt: Date.now() - (EXAMPLES.length - i) * 1000 }, 'example')),
    playlists: [], history: [], lastSongId: null, lastExport: 0, practice: { sessions: [], exercises: {} }, settings: { ...DEFAULT_SETTINGS }
  };
}
/** Vérifie et normalise une bibliothèque (chargement, import, restauration). Lève une erreur si le format est inconnu. */
function sanitizeStore(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.songs)) throw new Error('Ce fichier n’est pas une bibliothèque Harmonia (liste « songs » absente).');
  const seen = new Set();
  const songs = d.songs.filter((s) => s && typeof s === 'object').map((s) => makeSong(s, s.source || 'import')).filter((s) => !seen.has(s.id) && seen.add(s.id));
  const ids = new Set(songs.map((s) => s.id));
  const playlists = Array.isArray(d.playlists) ? d.playlists.filter((p) => p && p.name)
    .map((p) => ({ id: typeof p.id === 'string' ? p.id : uid(), name: str(p.name, 80), songIds: [...new Set((p.songIds || []).filter((x) => ids.has(x)))], createdAt: Number(p.createdAt) || Date.now() })) : [];
  return {
    version: 1, songs, playlists,
    history: Array.isArray(d.history) ? d.history.filter((x) => ids.has(x)).slice(0, 40) : [],
    lastSongId: ids.has(d.lastSongId) ? d.lastSongId : null,
    lastExport: Number(d.lastExport) || 0,
    practice: typeof cleanPractice === 'function' ? cleanPractice(d.practice) : { sessions: [], exercises: {} },
    settings: cleanSettings(d.settings)
  };
}

/* ---------- IndexedDB ---------- */
let db = null;
let storageMode = 'idb';      // 'idb' | 'local' | 'memory'
let storageOK = true;
let lastSaveError = '';
let migratedFromLegacy = false;
let store;

function idbOpen() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window) || !window.indexedDB) { reject(new Error('IndexedDB n’est pas disponible')); return; }
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('songs')) d.createObjectStore('songs', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('playlists')) d.createObjectStore('playlists', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
    };
    req.onsuccess = () => { const d = req.result; d.onversionchange = () => d.close(); resolve(d); };
    req.onerror = () => reject(req.error || new Error('Ouverture de la base refusée'));
    req.onblocked = () => reject(new Error('La base est bloquée par un autre onglet'));
  });
}
function idbReadAll() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['songs', 'playlists', 'meta'], 'readonly');
    const out = {};
    tx.objectStore('songs').getAll().onsuccess = (e) => { out.songs = e.target.result; };
    tx.objectStore('playlists').getAll().onsuccess = (e) => { out.playlists = e.target.result; };
    tx.objectStore('meta').get('state').onsuccess = (e) => { out.meta = e.target.result; };
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Lecture annulée'));
  });
}
/** Écrit l'état complet dans une seule transaction : en cas d'échec, rien n'est modifié. */
function idbWriteAll(st) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['songs', 'playlists', 'meta'], 'readwrite');
    const songs = tx.objectStore('songs'), pls = tx.objectStore('playlists');
    songs.clear(); st.songs.forEach((s) => songs.put(s));
    pls.clear(); st.playlists.forEach((p, i) => pls.put({ ...p, order: i }));
    tx.objectStore('meta').put({ version: 1, history: st.history, lastSongId: st.lastSongId, lastExport: st.lastExport || 0, settings: st.settings, practice: st.practice, savedAt: Date.now() }, 'state');
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error('Écriture refusée'));
    tx.onabort = () => reject(tx.error || new Error('Écriture annulée'));
  });
}
function readSettingsLS() {
  try { const raw = localStorage.getItem(LS_SETTINGS); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function writeSettingsLS(s) {
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); return true; } catch (e) { return false; }
}
function stateFromIdb(d) {
  return sanitizeStore({
    songs: d.songs || [], playlists: (d.playlists || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    history: d.meta?.history, lastSongId: d.meta?.lastSongId, lastExport: d.meta?.lastExport, practice: d.meta?.practice,
    settings: readSettingsLS() || d.meta?.settings
  });
}
async function loadStore() {
  try {
    db = await idbOpen();
    const d = await idbReadAll();
    storageMode = 'idb';
    if (d.meta || (d.songs && d.songs.length)) return stateFromIdb(d);
    // Premier lancement avec IndexedDB : reprise de l'ancien stockage s'il existe
    let legacy = null;
    try { const raw = localStorage.getItem(LS_LEGACY); if (raw) legacy = sanitizeStore(JSON.parse(raw)); } catch (e) { legacy = null; }
    const st = legacy || freshStore();
    await idbWriteAll(st);
    writeSettingsLS(st.settings);
    if (legacy) { migratedFromLegacy = true; try { localStorage.removeItem(LS_LEGACY); } catch (e) { /* conservé : sans risque */ } }
    return st;
  } catch (e) {
    db = null;
    lastSaveError = e && e.message || String(e);
    try {
      const raw = localStorage.getItem(LS_LEGACY);
      localStorage.setItem('harmonia:test', '1'); localStorage.removeItem('harmonia:test');
      storageMode = 'local';
      return raw ? sanitizeStore(JSON.parse(raw)) : freshStore();
    } catch (e2) {
      storageMode = 'memory'; storageOK = false;
      return freshStore();
    }
  }
}
async function reloadFromDisk() {
  if (storageMode !== 'idb' || !db) return false;
  try { store = stateFromIdb(await idbReadAll()); return true; } catch (e) { return false; }
}

/* ---------- Écriture ---------- */
let saveTimer = 0;
let writeChain = Promise.resolve(true);
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('harmonia') : null;
const TAB_ID = uid();
function humanStorageError(e) {
  const n = e && e.name;
  if (n === 'QuotaExceededError') return 'l’espace de stockage du navigateur est plein';
  if (n === 'InvalidStateError') return 'la base de données a été fermée (navigation privée ou données effacées)';
  return (e && e.message) || 'erreur inconnue';
}
function doWrite() {
  writeSettingsLS(store.settings);
  if (storageMode === 'idb' && db) return idbWriteAll(store);
  if (storageMode === 'local') { localStorage.setItem(LS_LEGACY, JSON.stringify(store)); return Promise.resolve(true); }
  return Promise.reject(new Error('aucun stockage n’est disponible dans ce navigateur'));
}
/** Enregistre maintenant et indique si l'écriture a réellement réussi. */
function saveNow() {
  clearTimeout(saveTimer);
  writeChain = writeChain.then(async () => {
    try {
      await doWrite();
      storageOK = true; lastSaveError = '';
      if (channel) channel.postMessage({ type: 'changed', from: TAB_ID });
      return true;
    } catch (e) {
      const wasOK = storageOK;
      storageOK = false; lastSaveError = humanStorageError(e);
      if (wasOK || storageMode !== 'memory') toast(`Enregistrement impossible : ${lastSaveError}. Exportez votre bibliothèque pour ne rien perdre.`, 'err');
      return false;
    }
  });
  return writeChain;
}
/** Enregistrement différé pour les changements fréquents (vitesse, taille du texte…). */
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }
/** Enregistre, puis affiche le message de réussite seulement si l'écriture a abouti. */
async function commit(okMsg, kind = 'ok') {
  const ok = await saveNow();
  if (ok && okMsg) toast(okMsg, kind);
  return ok;
}
window.addEventListener('pagehide', () => { if (saveTimer) { clearTimeout(saveTimer); doWrite().catch(() => {}); } });

/* ---------- Plusieurs onglets ouverts ---------- */
let onExternalChange = null;
if (channel) channel.onmessage = async (ev) => {
  if (!ev.data || ev.data.type !== 'changed' || ev.data.from === TAB_ID) return;
  if (await reloadFromDisk() && onExternalChange) onExternalChange();
};

/* ---------- Stockage persistant et occupation ---------- */
let persistState = 'inconnu';
async function requestPersistence() {
  try {
    if (!navigator.storage || !navigator.storage.persist) { persistState = 'non pris en charge'; return; }
    persistState = (await navigator.storage.persisted()) || (await navigator.storage.persist()) ? 'accordé' : 'refusé';
  } catch (e) { persistState = 'non pris en charge'; }
}
async function storageEstimate() {
  try { const e = await navigator.storage.estimate(); return e && e.usage != null ? e : null; } catch (e) { return null; }
}

/* ---------- Accès pratiques ---------- */
const S = () => store.settings;
const songById = (id) => store.songs.find((s) => s.id === id);
const infoCache = new Map();
function songInfo(s) {
  const k = s.id + ':' + s.updatedAt;
  if (!infoCache.has(k)) infoCache.set(k, bodyInfo(s.body, s.tab));
  return infoCache.get(k);
}
const ownSongs = () => store.songs.filter((s) => s.source === 'manual' || s.source === 'import');
