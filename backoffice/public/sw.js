/* Safe Production Service Worker for Orderium Backoffice */
const CACHE_NAME = 'orderium-backoffice-v1.0.1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Eo_circle_deep-orange_white_letter-o.svg',
];

// Only cache safe static file types
const ALLOWED_EXTENSIONS = [
  '.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate – clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-HTTP
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // Always bypass API calls
  if (url.pathname.startsWith('/api/')) return;

  // Always bypass WebSockets
  if (url.pathname.includes('socket.io')) return;

  // Do not cache TS/TSX or source files
  if (url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) return;

  // Only cache SAFE static file extensions
  const shouldCache = ALLOWED_EXTENSIONS.some(ext => url.pathname.endsWith(ext));

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Do not cache opaque responses
        if (shouldCache && res.ok && res.type !== 'opaque') {
          const responseToCache = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return res;
      })
      .catch(() => {
        // Offline fallback for cached items only
        if (shouldCache) return caches.match(req);
        return new Response('Offline - Resource not available', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      })
  );
});

// Allow skipWaiting
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
