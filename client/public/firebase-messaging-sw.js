/* Firebase Cloud Messaging Service Worker for Morocom Client Portal */
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration - Replace with your actual values
const firebaseConfig = {
  apiKey: "AIzaSyD1r4pCQDBE0xyWj62u9QGorFTp2DyVLDE",
  authDomain: "orderium-9df24.firebaseapp.com",
  projectId: "orderium-9df24",
  storageBucket: "orderium-9df24.firebasestorage.app",
  messagingSenderId: "199921288199",
  appId: "1:199921288199:web:63e59398df7cc0617096a2",
};

// Initialize Firebase only if config is available
let messaging = null;
try {
  if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
    console.log('[FCM SW] Firebase initialized successfully');
  } else {
    console.warn('[FCM SW] Firebase config not available');
  }
} catch (error) {
  console.error('[FCM SW] Firebase initialization error:', error);
}

// Handle background messages
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Morocom';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      tag: payload.data?.type || 'orderium-notification',
      data: payload.data || {},
      requireInteraction: true,
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
  console.log('[FCM SW] Notification clicked:', event);

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
  console.log('[FCM SW] Push subscription changed');

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((subscription) => {
        // Notify all clients about the new subscription
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

// Cache management for offline support
const CACHE_NAME = 'orderium-client-v1.0.0';

self.addEventListener('install', (event) => {
  console.log('[FCM SW] Installing service worker');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[FCM SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
