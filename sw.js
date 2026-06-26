// Service Worker — USABO PWA
// 缓存核心资源，支持离线使用

const CACHE_NAME = 'usabo-pwa-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './questions.enc.js',
  './auth.js',
  './app.js',
  './manifest.json',
  './icon.svg',
];

// ── 安装：预缓存核心资源 ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── 激活：清理旧缓存 ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// ── 拦截请求：缓存优先，网络回退 ──────────────────────────
self.addEventListener('fetch', (event) => {
  // 仅处理同源 GET 请求
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // 缓存新资源（同源有效响应）
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // 离线回退到首页
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
