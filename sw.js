// ⚠️ BUMP THIS VERSION every deploy to bust old caches
const CACHE_NAME = 'lifemaxx-cache-v95';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/formulas.js',
  './js/store.js',
  './js/ai-engine.js',
  './js/quest-progress.js',
  './js/seed.js',
  './js/components/notifications.js',
  './js/components/theme.js',
  './js/components/wheel.js',
  './js/components/quest-modal.js',
  './js/components/skill-modal.js',
  './js/components/stat-modal.js',
  './js/components/research-timer.js',
  './js/views/dashboard.js',
  './js/views/skill-detail.js',
  './js/views/quest-log.js',
  './js/views/home.js',
  './js/views/settings.js',
  './js/views/skills.js',
  './js/views/skill-hub.js',
  './js/views/skill-widgets.js',
  './js/views/skill-chains.js',
  './js/views/stats.js',
  './js/views/me.js',
  './js/views/coach.js',
  './js/main.js'
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching assets v50');
      return cache.addAll(ASSETS);
    })
  );
  // Take control immediately — don't wait for old SW to die
  self.skipWaiting();
});

// Activate: delete ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// Fetch: Network-First strategy
// → Always try the network first so users get fresh content.
// → Only fall back to cache when offline (airplane mode, etc.)
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (CDN fonts, Quill, etc.) — let browser handle them
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Got a fresh response — update the cache in background
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed (offline) — serve from cache
        return caches.match(event.request).then(cachedResponse => {
          return cachedResponse || new Response('Offline', { status: 503 });
        });
      })
  );
});

