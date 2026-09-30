/**
 * agy-solitaire: Service Worker (Cache-First Offline Play)
 */

const CACHE_NAME = 'agy-solitaire-v22';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './favicon.svg',
  './favicon-kq-stacked.svg',
  './apple-touch-icon.png',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './css/style.css',
  './js/i18n.js',
  './js/deck.js',
  './js/audio.js',
  './js/celebration.js',
  './js/game.js',
  './sound-icon-preview.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((response) => {
      return response || fetch(e.request);
    })
  );
});
