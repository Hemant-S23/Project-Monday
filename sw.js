/**
 * PROJECT MONDAY — PWA SERVICE WORKER
 * Cache-first offline shell strategy for ultra-low latency workstation booting.
 */

const CACHE_NAME = 'monday-neural-cache-v2.2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/terminal.html',
  '/style-guide.html',
  '/components-gallery.html',
  '/manifest.json',
  '/styles/main.css',
  '/styles/tokens.css',
  '/styles/glass.css',
  '/styles/components.css',
  '/styles/typography.css',
  '/styles/background.css',
  '/styles/layout.css',
  '/styles/reset.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache non-blocking warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore non-GET or cross-origin WebSocket requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache successful local responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for offline navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

