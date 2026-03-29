/* Firebase Cloud Messaging Service Worker for Morocom Backoffice */
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration - Must match the values in .env
const firebaseConfig = {
  apiKey: "AIzaSyD1r4pCQDBE0xyWj62u9QGorFTp2DyVLDE",
  authDomain: "orderium-9df24.firebaseapp.com",
  projectId: "orderium-9df24",
  storageBucket: "orderium-9df24.firebasestorage.app",
  messagingSenderId: "199921288199",
  appId: "1:199921288199:web:63e59398df7cc0617096a2",
};

const getNotificationIconUrl = () => `${self.location.origin}/notification-icon.png`;

// Initialize Firebase immediately to register event handlers during initial evaluation
let messaging = null;
if (firebaseConfig.apiKey) {
  try {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
  } catch (error) {
    console.error('[FCM SW] Firebase initialization error:', error);
  }
}

// Handle background messages using Firebase's handler
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const notificationTitle =
      payload.notification?.title || payload.data?.title || 'Morocom Backoffice';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || '',
      icon: getNotificationIconUrl(),
      badge: getNotificationIconUrl(),
      tag: payload.data?.type || 'orderium-backoffice-notification',
      data: payload.data || {},
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Voir',
        },
        {
          action: 'dismiss',
          title: 'Fermer',
        },
      ],
    };

    // Add image if provided
    if (payload.notification?.image) {
      notificationOptions.image = payload.notification.image;
    }

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Get the click action URL from data
  const urlToOpen = event.notification.data?.clickAction || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an existing window and focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: event.notification.data,
            });
            return client.focus();
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((subscription) => {
        return clients.matchAll().then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: subscription,
            });
          });
        });
      }),
  );
});

// Cache name for offline support
const CACHE_NAME = 'orderium-backoffice-v1.0.1';
const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

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
  if (IS_DEV) {
    self.skipWaiting();
    return;
  }
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
  if (IS_DEV) {
    self.clients.claim();
    return;
  }
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
  if (IS_DEV) return;
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

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
