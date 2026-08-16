const CACHE = 'iag-static-v3';
const APP_SCOPE = '/industrial-asset-graph/';
const STATIC_ASSETS = [
  `${APP_SCOPE}manifest.webmanifest`,
  `${APP_SCOPE}assets/line2/control-cabinet/cabinet.svg`,
  `${APP_SCOPE}assets/line2/control-cabinet/cabinet.png`,
  `${APP_SCOPE}assets/line2/control-cabinet/metadata.json`,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => undefined)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window' });
    await Promise.all(clients.map((client) => client.navigate(client.url)));
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // HTML must never be cache-first: Vite filenames change on every deployment.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(`${APP_SCOPE}index.html`)));
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && new URL(event.request.url).origin === self.location.origin) {
      const cache = await caches.open(CACHE);
      cache.put(event.request, response.clone());
    }
    return response;
  })());
});
