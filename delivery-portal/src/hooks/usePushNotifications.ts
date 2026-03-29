import { useState, useEffect, useCallback, useRef } from 'react';
import { MessagePayload } from 'firebase/messaging';
import {
  initializeFirebase,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  getFCMToken,
  onForegroundMessage,
  getDeviceInfo,
  getPlatform,
} from '../services/firebase';

const API_URL = '';

export type NotificationPermissionStatus = NotificationPermission | 'unsupported' | 'loading';

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermissionStatus;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface UsePushNotificationsReturn extends PushNotificationState {
  requestPermission: () => Promise<boolean>;
  registerToken: (userId: number) => Promise<boolean>;
  unregisterToken: () => Promise<boolean>;
  refreshToken: () => Promise<string | null>;
}

// App type for delivery portal
const APP_TYPE = 'delivery';

// Local storage key for token
const TOKEN_STORAGE_KEY = 'orderium_delivery_fcm_token';
const PROJECT_STORAGE_KEY = 'orderium_delivery_fcm_project';
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '';

async function httpRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`HTTP error! status: ${res.status}, body: ${errorBody}`);
  }

  return res.json();
}

/**
 * Hook for managing push notifications in the Delivery Portal
 */
export function usePushNotifications(
  userId?: number,
  onNotification?: (payload: MessagePayload) => void
): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'loading',
    token: null,
    isLoading: true,
    error: null,
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);
  const hasRegisteredRef = useRef(false);

  // Initialize Firebase and check permission status
  useEffect(() => {
    const initialize = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      const supported = isNotificationSupported();

      if (!supported) {
        setState({
          isSupported: false,
          permission: 'unsupported',
          token: null,
          isLoading: false,
          error: 'Push notifications are not supported in this browser',
        });
        return;
      }

      initializeFirebase();
      await registerServiceWorker();

      const storedProjectId = localStorage.getItem(PROJECT_STORAGE_KEY);
      if (storedProjectId !== PROJECT_ID) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      if (PROJECT_ID) {
        localStorage.setItem(PROJECT_STORAGE_KEY, PROJECT_ID);
      }

      const permission = getNotificationPermission();
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      setState({
        isSupported: true,
        permission: permission === 'unsupported' ? 'default' : permission,
        token: storedToken,
        isLoading: false,
        error: null,
      });
    };

    initialize();
  }, []);

  // Set up foreground message handler
  useEffect(() => {
    if (!state.isSupported || state.permission !== 'granted') {
      return;
    }

    unsubscribeRef.current = onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);

      if (onNotification) {
        onNotification(payload);
      }

      // Show native notification for foreground messages
      if (payload.notification) {
        const { title, body } = payload.notification;
        new Notification(title || 'Morocom Livraison', {
          body,
          icon: '/notification-icon.png',
          data: payload.data,
          vibrate: [200, 100, 200],
        });
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [state.isSupported, state.permission, onNotification]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await requestNotificationPermission();

      setState((prev) => ({
        ...prev,
        permission,
        isLoading: false,
      }));

      if (permission === 'granted') {
        const token = await getFCMToken();
        if (token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
          setState((prev) => ({ ...prev, token }));
        }
        return true;
      }

      return false;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to request permission',
      }));
      return false;
    }
  }, [state.isSupported]);

  // Register token with server
  const registerTokenToServer = async (userId: number, token: string): Promise<boolean> => {
    try {
      const deviceInfo = getDeviceInfo();
      const platform = getPlatform();

      await httpRequest(`/api/notifications/device-token/${userId}`, {
        method: 'POST',
        body: JSON.stringify({
          token,
          platform,
          appType: APP_TYPE,
          deviceName: deviceInfo.deviceName,
          browserName: deviceInfo.browserName,
          osName: deviceInfo.osName,
        }),
      });

      console.log('Device token registered successfully');
      return true;
    } catch (error) {
      console.error('Failed to register device token:', error);
      return false;
    }
  };

  // Register token
  const registerToken = useCallback(async (userId: number): Promise<boolean> => {
    if (!state.isSupported) {
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (state.permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Notification permission denied',
          }));
          return false;
        }
      }

      const token = await getFCMToken();
      if (!token) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to get FCM token',
        }));
        return false;
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setState((prev) => ({ ...prev, token }));

      const success = await registerTokenToServer(userId, token);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: success ? null : 'Failed to register token with server',
      }));

      return success;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to register token',
      }));
      return false;
    }
  }, [state.isSupported, state.permission, state.token, requestPermission]);

  // Auto-register token when userId changes and permission is granted
  useEffect(() => {
    if (!hasRegisteredRef.current && userId && state.permission === 'granted') {
      hasRegisteredRef.current = true;
      registerToken(userId);
    }
  }, [userId, state.permission, registerToken]);

  // Unregister token
  const unregisterToken = useCallback(async (): Promise<boolean> => {
    const token = state.token || localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      return true;
    }

    try {
      await httpRequest('/api/notifications/device-token', {
        method: 'DELETE',
        body: JSON.stringify({ token }),
      });

      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setState((prev) => ({ ...prev, token: null }));

      return true;
    } catch (error) {
      console.error('Failed to unregister device token:', error);
      return false;
    }
  }, [state.token]);

  // Refresh token
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!state.isSupported || state.permission !== 'granted') {
      return null;
    }

    try {
      const token = await getFCMToken();
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        setState((prev) => ({ ...prev, token }));

        await httpRequest(`/api/notifications/device-token/${token}/refresh`, {
          method: 'PATCH',
        });
      }
      return token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }, [state.isSupported, state.permission]);

  return {
    ...state,
    requestPermission,
    registerToken,
    unregisterToken,
    refreshToken,
  };
}

export default usePushNotifications;
