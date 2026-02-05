import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  Messaging,
  MessagePayload,
} from 'firebase/messaging';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// VAPID key for web push
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase app
 */
export function initializeFirebase(): FirebaseApp | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!firebaseConfig.apiKey) {
    console.warn('Firebase config not available');
    return null;
  }

  try {
    const apps = getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
    } else {
      firebaseApp = initializeApp(firebaseConfig);
    }
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return null;
  }
}

/**
 * Get Firebase Messaging instance
 */
export function getFirebaseMessaging(): Messaging | null {
  if (messaging) {
    return messaging;
  }

  const app = initializeFirebase();
  if (!app) {
    return null;
  }

  try {
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('Failed to get Firebase Messaging:', error);
    return null;
  }
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Register the Firebase messaging service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Get FCM token for push notifications
 */
export async function getFCMToken(): Promise<string | null> {
  const fcmMessaging = getFirebaseMessaging();
  if (!fcmMessaging) {
    return null;
  }

  if (!vapidKey) {
    console.warn('VAPID key not configured');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(fcmMessaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      return token;
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

/**
 * Subscribe to foreground messages
 */
export function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): (() => void) | null {
  const fcmMessaging = getFirebaseMessaging();
  if (!fcmMessaging) {
    return null;
  }

  return onMessage(fcmMessaging, callback);
}

/**
 * Detect browser and OS information
 */
export function getDeviceInfo(): {
  browserName: string;
  osName: string;
  deviceName: string;
} {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let osName = 'Unknown';
  let deviceName = 'Unknown Device';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserName = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browserName = 'Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browserName = 'Opera';
  }

  if (userAgent.includes('Windows')) {
    osName = 'Windows';
    deviceName = 'Windows PC';
  } else if (userAgent.includes('Mac OS')) {
    osName = 'macOS';
    deviceName = 'Mac';
  } else if (userAgent.includes('Linux')) {
    osName = 'Linux';
    deviceName = 'Linux PC';
  } else if (userAgent.includes('Android')) {
    osName = 'Android';
    deviceName = 'Android Device';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    osName = 'iOS';
    deviceName = userAgent.includes('iPad') ? 'iPad' : 'iPhone';
  }

  return { browserName, osName, deviceName };
}

/**
 * Detect platform type
 */
export function getPlatform(): 'web' | 'android' | 'ios' {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Android')) {
    return 'android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    return 'ios';
  }
  
  return 'web';
}

export { firebaseConfig, vapidKey };
