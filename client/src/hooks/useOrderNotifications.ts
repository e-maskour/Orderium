import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import { useToast } from './use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface UseOrderNotificationsOptions {
  token?: string;
  customerId?: number;
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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const { isConnected, error, onOrderCreated, onOrderAssigned, onOrderStatusChanged, onOrderCancelled } = useSocket({
    token,
    userType: 'customer',
    customerId,
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

    // Handle order created
    const unsubscribeCreated = onOrderCreated((data) => {
      const title = 'Order Created';
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
    const unsubscribeAssigned = onOrderAssigned((data) => {
      const title = 'Delivery Assigned';
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
      const statusMessages: Record<string, string> = {
        to_delivery: 'Your order is confirmed and will be picked up soon.',
        in_delivery: 'Your order is on the way!',
        delivered: 'Your order has been delivered. Enjoy!',
      };

      const title = 'Order Status Updated';
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
      const title = 'Order Cancelled';
      const body = `Order ${data.orderNumber} has been cancelled.`;
      
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
  }, [enabled, isConnected, onOrderCreated, onOrderAssigned, onOrderStatusChanged, onOrderCancelled, toast, queryClient]);

  return {
    isConnected,
    error,
    notificationPermission,
  };
};
