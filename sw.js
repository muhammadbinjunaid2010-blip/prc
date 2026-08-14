/* PRC Pakistan app service worker — cache app shell for fast, reliable loading */
const CACHE = 'prc-app-v2';
const APP_SHELL = [
  './',
  './app.html',
  './tailwind.css',
  './manifest.webmanifest',
  './images/assets/logo.webp',
  './images/assets/logo-192.png',
  './images/assets/logo-512.png',
  './privacy-policy.html'
];

self.addEventListener('install', (e) => {
  // Cache each shell file individually so one unavailable file can't fail the
  // whole install (a failed install would make the site non-installable).
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(APP_SHELL.map((url) => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App shell: cache-first for instant load
  if (url.origin === location.origin && (url.pathname.endsWith('/app.html') || url.pathname.endsWith('/') || url.pathname.endsWith('/tailwind.css'))) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const fetchPromise = fetch(req).then((res) => {
          if (res.ok) { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(req, clone)); }
          return res;
        }).catch(() => hit);
        return hit || fetchPromise;
      })
    );
    return;
  }

  // Everything else (article pages, images, fonts): network-first, cache fallback
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone));
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('./app.html')))
  );
});
