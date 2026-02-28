import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

export function PushNotificationProvider() {
  const { admin, isAuthenticated } = useAuth();
  const {
    requestPermission,
    permission,
    token,
    error,
  } = usePushNotifications(admin?.id);

  const hasRequestedPermissionRef = useRef(false);

  // Request permission once when admin is authenticated
  useEffect(() => {
    if (isAuthenticated && admin?.id && permission === 'default' && !hasRequestedPermissionRef.current) {
      hasRequestedPermissionRef.current = true;
      console.log('Requesting notification permission...');
      requestPermission().then((granted) => {
        if (granted) {
          console.log('✅ INotification permission granted');
        } else {
          console.log('❌ INotification permission denied');
        }
      });
    }
  }, [isAuthenticated, admin?.id, permission, requestPermission]);

  useEffect(() => {
    if (error) {
      console.error('Push notification error:', error);
    }
  }, [error]);

  useEffect(() => {
    if (token) {
      console.log('✅ Push notifications enabled for admin:', admin?.fullName || admin?.phoneNumber);
    }
  }, [token, admin]);

  // This component doesn't render anything
  return null;
}
