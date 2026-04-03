/* Safe Production Service Worker for Morocom Backoffice */
const CACHE_NAME = 'orderium-backoffice-v2';

// Do NOT pre-cache index.html — always fetch it from network
// so the browser always gets the latest Vite entry point.
const STATIC_ASSETS = ['/manifest.json', '/Eo_circle_deep-orange_white_letter-o.svg'];

// Only cache safe static file types (Vite hashed assets)
const ALLOWED_EXTENSIONS = [
  '.js',
  '.css',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
];

// Hostnames that should NEVER be intercepted by the SW.
// In production the API & storage live on separate subdomains.
const BYPASS_HOSTS = ['orderium-api.mar-nova.com', 'storage.mar-nova.com'];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache static assets:', err);
      });
    }),
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
        }),
      ),
    ),
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-HTTP
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // Always bypass API / storage / external service calls (hostname check)
  if (BYPASS_HOSTS.includes(url.hostname)) return;

  // Also bypass any requests to known third-party services
  if (url.hostname.includes('firebase') || url.hostname.includes('google')) return;

  // Always bypass API calls by path (covers dev/localhost)
  if (url.pathname.startsWith('/api/')) return;

  // Always bypass WebSockets
  if (url.pathname.includes('socket.io')) return;

  // Never cache index.html — always go to network so we pick up new deploys
  if (url.pathname === '/' || url.pathname === '/index.html') return;

  // Do not cache TS/TSX or source files
  if (url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) return;

  // Only cache SAFE static file extensions (Vite hashed bundles)
  const shouldCache = ALLOWED_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

  if (!shouldCache) return;

  // Network-first for cacheable assets, with a 5-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  event.respondWith(
    fetch(req, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId);
        if (res.ok && res.type !== 'opaque') {
          const responseToCache = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return res;
      })
      .catch(() => {
        clearTimeout(timeoutId);
        // Offline fallback — serve from cache if available
        return caches.match(req).then(
          (cached) =>
            cached ||
            new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
            }),
        );
      }),
  );
});

// Allow skipWaiting
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
