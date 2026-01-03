import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';

interface UseOrderNotificationsOptions {
  token?: string;
  enabled?: boolean;
}

// Request notification permission
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

// Show browser notification
const showBrowserNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Focus window when notification is clicked
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

export const useOrderNotifications = (options: UseOrderNotificationsOptions) => {
  const { token, enabled = true } = options;
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const { isConnected, error, onOrderCreated, onOrderAssigned, onOrderStatusChanged, onOrderCancelled } = useSocket({
    token,
    userType: 'admin',
    autoConnect: enabled,
  });

  // Request notification permission on mount
  useEffect(() => {
    if (enabled) {
      requestNotificationPermission().then(setNotificationPermission);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isConnected) return;

    // Handle new order created
    const unsubscribeCreated = onOrderCreated((data) => {
      const title = t('notifications.newOrder');
      const body = `${t('order')} ${data.orderNumber}`;
      
      // Show toast
      toast.success(title, {
        description: body,
        duration: 5000,
      });
      
      // Show browser notification
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
      });
      
      // Play notification sound (optional)
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => console.log('Could not play notification sound'));
      
      // Invalidate orders query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    // Handle order assigned
    const unsubscribeAssigned = onOrderAssigned((data) => {
      const title = t('notifications.orderAssigned');
      const body = `${t('order')} ${data.orderNumber}`;
      
      toast.info(title, {
        description: body,
      });
      
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    // Handle order status change
    const unsubscribeStatusChanged = onOrderStatusChanged((data) => {
      const statusText = data.status ? t(`status.${data.status}`) : data.status;
      const title = t('notifications.statusChanged');
      const body = `${t('order')} ${data.orderNumber} - ${statusText}`;
      
      toast.info(title, {
        description: body,
      });
      
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    // Handle order cancelled
    const unsubscribeCancelled = onOrderCancelled((data) => {
      const title = t('notifications.orderCancelled');
      const body = `${t('order')} ${data.orderNumber}`;
      
      toast.error(title, {
        description: body,
      });
      
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
        requireInteraction: true, // Keep notification visible until user interacts
      });
      
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    return () => {
      unsubscribeCreated();
      unsubscribeAssigned();
      unsubscribeStatusChanged();
      unsubscribeCancelled();
    };
  }, [enabled, isConnected, onOrderCreated, onOrderAssigned, onOrderStatusChanged, onOrderCancelled, queryClient, t]);

  return {
    isConnected,
    error,
    notificationPermission,
  };
};
