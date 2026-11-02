/**
 * PROJECT MONDAY — PWA SERVICE WORKER
 * Network-First strategy for HTML navigation & Stale-While-Revalidate for static assets.
 * Ensures zero stale cache on fresh opens while preserving ultra-fast offline fallback.
 */

const CACHE_NAME = 'monday-neural-cache-v6.0';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/terminal.html',
  '/style-guide.html',
  '/components-gallery.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[ServiceWorker] Purging legacy cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignore non-GET, Chrome extension, or WebSocket requests
  if (req.method !== 'GET' || req.url.startsWith('chrome-extension') || req.url.includes('socket') || req.url.includes('coinbase') || req.url.includes('binance')) {
    return;
  }

  const isNavigation = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    // 🌐 NETWORK-FIRST for HTML Entrypoints:
    // Always fetch fresh HTML from network so users get the latest deploy. Fallback to cache only if offline.
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            if (req.url.includes('terminal')) return caches.match('/terminal.html');
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // ⚡ STALE-WHILE-REVALIDATE for Static Assets (CSS, JS, Fonts, Images)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Ignore network errors in background revalidation
        });

      return cachedResponse || fetchPromise;
    })
  );
});
