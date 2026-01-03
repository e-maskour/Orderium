import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface UseOrderNotificationsOptions {
  token?: string;
  deliveryPersonId?: number;
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

    // Auto close after 8 seconds
    setTimeout(() => notification.close(), 8000);

    // Focus window when notification is clicked
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

export const useOrderNotifications = (options: UseOrderNotificationsOptions) => {
  const { token, deliveryPersonId, enabled = true } = options;
  const queryClient = useQueryClient();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const { isConnected, error, onOrderAssigned, onOrderStatusChanged, onOrderCancelled } = useSocket({
    token,
    userType: 'delivery',
    deliveryPersonId,
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

    // Handle new order assignment
    const unsubscribeAssigned = onOrderAssigned((data) => {
      const title = 'New Order Assigned';
      const body = `Order ${data.orderNumber} has been assigned to you.`;
      
      toast.success(title, {
        description: body,
        duration: 5000,
      });
      
      // Show browser notification
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
        requireInteraction: true, // Important for delivery - keep visible
        vibrate: [200, 100, 200], // Vibrate pattern on mobile
      });
      
      // Play notification sound (optional)
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => console.log('Could not play notification sound'));
      
      // Invalidate orders query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['assigned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    // Handle order status change
    const unsubscribeStatusChanged = onOrderStatusChanged((data) => {
      const title = 'Order Status Updated';
      const body = `Order ${data.orderNumber} status: ${data.status}`;
      
      toast.info(title, {
        description: body,
      });
      
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['assigned-orders'] });
    });

    // Handle order cancelled
    const unsubscribeCancelled = onOrderCancelled((data) => {
      const title = 'Order Cancelled';
      const body = `Order ${data.orderNumber} has been cancelled.`;
      
      toast.error(title, {
        description: body,
      });
      
      showBrowserNotification(title, {
        body,
        tag: `order-${data.orderId}`,
        requireInteraction: true,
      });
      
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['assigned-orders'] });
    });

    return () => {
      unsubscribeAssigned();
      unsubscribeStatusChanged();
      unsubscribeCancelled();
    };
  }, [enabled, isConnected, onOrderAssigned, onOrderStatusChanged, onOrderCancelled, queryClient]);

  return {
    isConnected,
    error,
    notificationPermission,
  };
};
