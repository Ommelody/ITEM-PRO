// sw.js — Item Master Pro V2 PWA service worker
// Caches the app shell for install + offline shell. Never caches Supabase API (cross-origin).
const CACHE = 'imp-shell-v1';
const SHELL = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icon.png',
  './favicon.ico'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Only handle same-origin GET; everything else (Supabase, CDNs) goes straight to network.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Network-first for navigations so the newest HTML wins; fall back to cached shell offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static shell assets.
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => cached))
  );
});
