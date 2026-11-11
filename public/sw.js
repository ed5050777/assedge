const CACHE_NAME = 'refumo-assedge-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/aistudio/refumo_orange_no_backround_0ec90715.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
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

// Network-first for fresh app code, fallback to cache ONLY for HTML navigation when offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER intercept cross-origin requests (Tailscale Funnel, Google APIs, Firebase, external databases)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. NEVER intercept API or backend function routes
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/.netlify')) {
    return;
  }

  // 3. For same-origin static assets and HTML navigation
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, toCache);
          });
        }
        return response;
      })
      .catch(() => {
        // ONLY return index.html for page navigation (e.g. user offline refreshing the web app)
        // NEVER return index.html for data/asset/JSON requests!
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return caches.match(event.request);
      })
  );
});
