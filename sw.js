// Offline support. Online: always fetch the newest files (so updates show at once) and keep a copy.
// Offline: use the saved copy. Bump CACHE when the list of core files changes.
const CACHE = 'town-builder-v7';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './src/main.js',
  './src/config.js',
  './src/joystick.js',
  './src/models.js',
  './src/player.js',
  './src/world.js',
  './src/gather.js',
  './src/sites.js',
  './src/save.js',
  './src/converters.js',
  './src/ui.js',
  './src/upgrades.js',
  './src/helpers.js',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
