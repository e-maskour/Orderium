import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import { useToast } from './use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';

interface UseOrderNotificationsOptions {
  token?: string;
  customerId?: number;
  enabled?: boolean;
}

// Request notification permission
const requestNotificationPermission = async (t: (key: string) => string) => {
  if (!('Notification' in window)) {
    console.log(t('browserNotSupported'));
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

    // Auto close after 6 seconds
    setTimeout(() => notification.close(), 6000);

    // Focus window when notification is clicked
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

export const useOrderNotifications = (options: UseOrderNotificationsOptions) => {
  const { token, customerId, enabled = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const { isConnected, error, onOrderCreated, onOrderAssigned, onOrderStatusChanged, onOrderCancelled } = useSocket({
    token,
    userType: 'customer',
    customerId,
    autoConnect: enabled,
  });

  // Request notification permission on mount
  useEffect(() => {
    if (enabled) {t).then(setNotificationPermission);
    }
  }, [enabled, t
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isConnected) return;

    // Handle order created
    const unsubscribt('orderCreatedTitle');
      const body = t('orderCreatedMessage').replace('{orderNumber}', data.orderNumber)
      const body = `Your order ${data.orderNumber} has been created successfully.`;
      
      toast({
        title,
        description: body,
      });
      
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
      });
      
      // Invalidate orders query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    // Handle order assigned to delivery person
    const unsubscribt('deliveryAssignedTitle');
      const body = t('deliveryAssignedMessage').replace('{orderNumber}', data.orderNumber)
      const body = `Your order ${data.orderNumber} has been assigned to a delivery person.`;
      
      toast({
        title,
        description: body,
      });
      
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
      });
      
      // Invalidate specific order query
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    // Handle order status change
    const unsubscribeStatusChanged = onOrderStatusChanged((data) => {
      const statusMest('orderStatusToDeliveryMessage'),
        in_delivery: t('orderStatusInDeliveryMessage'),
        delivered: t('orderStatusDeliveredMessage'),
      };

      const title = t('orderStatusUpdatedTitle');
      const body = statusMessages[data.status || ''] || t('orderStatusChangedMessage').replace('{orderNumber}', data.orderNumber)
      const body = statusMessages[data.status || ''] || `Order ${data.orderNumber} status changed.`;

      toast({
        title,
        description: body,
      });
      
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
        vibrate: data.status === 'delivered' ? [200, 100, 200, 100, 200] : undefined,
      });
      
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    // Handle order cancelled
    const unsubscribeCancelled = onOrderCancelled((data) => {
      const title = t('orderCancelledTitle');
      const body = t('orderCancelledMessage').replace('{orderNumber}', data.orderNumber);
      
      toast({
        title,
        description: body,
        variant: 'destructive',
      });
      
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
        requireInteraction: true,
      });
      
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    return () => {
      unsubscribeCreated();
      unsubscribeAssigned();
      unsubscribeStatusChanged();
      unsubscribeCancelled();
    };
  }, [enabled, isConnected, onOrderCreated, onOrderAssigned, onOrderStatusChanged, onOrderCancelled, toast, queryClient, t]);

  return {
    isConnected,
    error,
    notificationPermission,
  };
};
