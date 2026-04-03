import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

export function PushNotificationProvider() {
  const { deliveryPerson, isAuthenticated } = useAuth();
  const { requestPermission, permission, error } = usePushNotifications(deliveryPerson?.id);

  const hasRequestedPermissionRef = useRef(false);

  // Request permission once when delivery person is authenticated
  useEffect(() => {
    if (
      isAuthenticated &&
      deliveryPerson?.id &&
      permission === 'default' &&
      !hasRequestedPermissionRef.current
    ) {
      hasRequestedPermissionRef.current = true;
      requestPermission();
    }
  }, [isAuthenticated, deliveryPerson?.id, permission, requestPermission]);

  useEffect(() => {
    if (error) {
      console.error('Push notification error:', error);
    }
  }, [error]);

  return null;
}
