/* Harmonia — service worker : mise en cache pour l'installation et l'usage hors ligne.
   Les chansons ne passent jamais par ici : elles sont dans IndexedDB, sur l'appareil. */
'use strict';
const VERSION = 'harmonia-1.7.0';
const APP_CACHE = VERSION + '-app';
const FONT_CACHE = 'harmonia-fonts';
const APP_FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/util.js', 'js/music.js', 'js/theme.js', 'js/chordpro.js', 'js/instruments.js', 'js/catalog.js', 'js/data.js', 'js/audio.js', 'js/import.js', 'js/ocr.js', 'js/musicxml.js', 'js/practice.js', 'js/listen.js',
  'js/ui/shell.js', 'js/ui/reader.js', 'js/ui/editor.js', 'js/ui/playlists.js', 'js/ui/tuner.js', 'js/ui/settings.js', 'js/ui/progress.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('harmonia-') && k !== APP_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Polices Google et modules de lecture PDF / reconnaissance de texte (versions figées) : cache d'abord.
  if (['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'tessdata.projectnaptha.com'].includes(url.hostname)) {
    event.respondWith(caches.open(FONT_CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }
      catch (e) { return new Response('', { status: 504, statusText: 'Hors ligne' }); }
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Page principale : réseau d'abord pour recevoir les mises à jour, cache si hors ligne.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(APP_CACHE).then((c) => c.put('index.html', copy));
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }

  // Fichiers de l'application : réponse immédiate depuis le cache, mise à jour en arrière-plan.
  event.respondWith(caches.open(APP_CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || new Response('Ressource indisponible hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
