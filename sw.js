// Service Worker — USABO PWA (Hardened)
// Cache-first with network fallback, cache-busting on version change

const CACHE_NAME = 'usabo-pwa-v18';
const CORE_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './questions.enc.js',
  './auth.js',
  './app.js',
  './manifest.json',
  './icon.svg',
];

// ── Install: pre-cache core resources ──────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: purge ALL old caches (security update) ──────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => {
            return caches.delete(k);
          })
      );
    }).then(() => {
      // Force all clients to reload to get fresh code
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      });
    })
  );
  self.clients.claim();
});

// ── Fetch: cache-first for same-origin GET, no-op for others ──
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // For navigation requests, try network first (to get latest HTML with CSP),
  // then fall back to cache, then offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the latest navigation response
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // For static assets: cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: try cache as last resort
          return caches.match(event.request);
        });
    })
  );
});
