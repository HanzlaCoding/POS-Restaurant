/**
 * BiteDash POS • PWA Service Worker (v3 - Zero-Downtime Live Updates)
 * Handles automatic over-the-air updates when online + full offline fallback.
 */

const CACHE_NAME = 'bitedash-pos-v3';

const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './android-bridge.js',
  './printer-helper.js',
  './manifest.json',
  './assets/icons/icon.svg'
];

// Pre-cache core files on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Cache prefetch note:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Purge obsolete caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First for HTML/JS (Fresh code deployments) with Offline Cache Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip caching for external API requests (e.g. Supabase REST)
  if (url.origin.includes('supabase.co')) {
    return;
  }

  // Network-First Strategy for Core App Assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline Fallback: Serve from local cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If navigating and offline, return cached index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
