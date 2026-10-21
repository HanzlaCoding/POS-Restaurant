/**
 * The Artisan Grill & Co. • PWA Service Worker
 * Standalone Offline Caching & High-Performance Resource Delivery
 */

const CACHE_NAME = 'artisan-pos-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/icons/icon.svg',
  './assets/images/wagyu_smash.jpg',
  './assets/images/truffle_burger.jpg',
  './assets/images/jalapeno_burger.jpg',
  './assets/images/double_cheese.jpg',
  './assets/images/loaded_fries.jpg',
  './assets/images/peri_fries.jpg',
  './assets/images/onion_rings.jpg',
  './assets/images/buffalo_wings.jpg',
  './assets/images/mint_cooler.jpg',
  './assets/images/peach_tea.jpg',
  './assets/images/cola_can.jpg',
  './assets/images/caramel_shake.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('PWA cache prefetch note:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch newer version in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
