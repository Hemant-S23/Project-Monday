/**
 * PROJECT MONDAY — PWA SERVICE WORKER
 * Network-First strategy for HTML navigation & Stale-While-Revalidate for static assets.
 * Ensures zero stale cache on fresh opens while preserving ultra-fast offline fallback.
 */

const CACHE_NAME = 'monday-speed-v7.7';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './terminal.html',
  './manifest.json'
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
    // 🌐 FAIL-FAST NETWORK-FIRST WITH 1.2s TIMEOUT FOR HTML ENTRYPOINTS:
    // Attempts to fetch fresh HTML, but if GitHub Pages or CDN doesn't answer within 1200ms,
    // immediately serves the cached version. Eliminates 30-45s frozen screen hangs!
    event.respondWith(
      new Promise((resolve) => {
        let isSettled = false;
        const fallbackToCache = () => {
          if (isSettled) return;
          isSettled = true;
          caches.match(req).then((cached) => {
            if (cached) return resolve(cached);
            caches.match('./terminal.html').then((termCached) => {
              if (termCached) return resolve(termCached);
              caches.match('/terminal.html').then((rootCached) => {
                if (rootCached) return resolve(rootCached);
                fetch(req).then(resolve).catch(() => {});
              });
            });
          });
        };

        // 1200ms strict timeout safeguard against GitHub Pages throttling
        const timeoutId = setTimeout(fallbackToCache, 1200);

        fetch(req, { cache: 'no-cache' })
          .then((networkResponse) => {
            if (!isSettled && networkResponse && networkResponse.status === 200) {
              clearTimeout(timeoutId);
              isSettled = true;
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
              resolve(networkResponse);
            } else if (!isSettled) {
              fallbackToCache();
            }
          })
          .catch(() => {
            fallbackToCache();
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
