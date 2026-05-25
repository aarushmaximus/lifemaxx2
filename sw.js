const CACHE_NAME = 'lifemaxx-v1';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/vision.css',
  './js/formulas.js',
  './js/store.js',
  './js/seed.js',
  './js/components/notifications.js',
  './js/components/theme.js',
  './js/components/wheel.js',
  './js/components/quest-modal.js',
  './js/components/skill-modal.js',
  './js/components/research-timer.js',
  './js/views/dashboard.js',
  './js/views/skill-detail.js',
  './js/views/quest-log.js',
  './js/views/research-hub.js',
  './js/views/settings.js',
  './js/main.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap',
  'https://cdn.quilljs.com/1.3.6/quill.snow.css',
  'https://cdn.quilljs.com/1.3.6/quill.js'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching offline assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First with Cache Fallback for resources
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached response if found
      if (cachedResponse) {
        // Fetch from network in background to update cache (stale-while-revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(err => console.log('Offline: cannot update cache', err));
        return cachedResponse;
      }
      
      // If not in cache, fetch from network
      return fetch(event.request).then(response => {
        // Cache new successful requests
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(err => {
        console.error('Fetch failed', err);
      });
    })
  );
});
