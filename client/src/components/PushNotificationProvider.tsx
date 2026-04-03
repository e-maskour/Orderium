import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

export function PushNotificationProvider() {
  const { user, isAuthenticated } = useAuth();
  const { requestPermission, permission, token, error } = usePushNotifications(user?.id);

  const hasRequestedPermissionRef = useRef(false);

  // Request permission once when user is authenticated
  useEffect(() => {
    if (
      isAuthenticated &&
      user?.id &&
      permission === 'default' &&
      !hasRequestedPermissionRef.current
    ) {
      hasRequestedPermissionRef.current = true;
      requestPermission();
    }
  }, [isAuthenticated, user?.id, permission, requestPermission]);

  useEffect(() => {
    if (error) {
      console.error('Push notification error:', error);
    }
  }, [error]);

  return null;
}
