const CACHE = 'iag-shell-v2';
const ASSETS = [
  '/industrial-asset-graph/',
  '/industrial-asset-graph/manifest.webmanifest',
  '/industrial-asset-graph/assets/line2/control-cabinet/cabinet.svg',
  '/industrial-asset-graph/assets/line2/control-cabinet/cabinet.png',
  '/industrial-asset-graph/assets/line2/control-cabinet/metadata.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch(() => undefined)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
