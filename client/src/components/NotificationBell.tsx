import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface Notification {
  Id: number;
  Title: string;
  Message: string;
  Type: string;
  OrderId?: number;
  OrderNumber?: string;
  IsRead: boolean;
  DateCreated: string;
}

interface NotificationBellProps {
  customerId?: number;
}

export function NotificationBell({ customerId }: NotificationBellProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const token = localStorage.getItem('authToken');

  // Socket connection
  const { socket } = useSocket({
    token: token || undefined,
    userType: 'customer',
    customerId: customerId,
    autoConnect: !!customerId && !!token,
  });

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !customerId) return;

    const handleNewNotification = (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      const { title, message } = translateNotification(notification);
      // Optional: Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
        });
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, customerId, queryClient]);

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'customer', customerId],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userType=customer&customerId=${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!customerId,
    refetchInterval: 30000,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'customer', customerId, 'unread-count'],
    queryFn: async () => {
      const response = await fetch(`/api/notifications/unread-count?userType=customer&customerId=${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch unread count');
      return response.json();
    },
    enabled: !!customerId,
    refetchInterval: 10000,
  });

  const unreadCount = unreadData?.count || 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType: 'customer', customerId }),
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo').replace('{minutes}', minutes.toString());
    if (hours < 24) return t('hoursAgo').replace('{hours}', hours.toString());
    return t('daysAgo').replace('{days}', days.toString());
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "w-10 h-10 rounded-full flex items-center justify-center text-white text-lg";
    switch (type) {
      case 'order_created':
        return <div className={`${iconClass} bg-green-500`}>🆕</div>;
      case 'order_assigned':
        return <div className={`${iconClass} bg-blue-500`}>📦</div>;
      case 'order_status_changed':
        return <div className={`${iconClass} bg-yellow-500`}>🔄</div>;
      case 'order_cancelled':
        return <div className={`${iconClass} bg-red-500`}>❌</div>;
      default:
        return <div className={`${iconClass} bg-gray-500`}>📬</div>;
    }
  };

  const translateNotification = (notification: Notification) => {
    // Map old English titles to translation keys
    const titleMap: Record<string, string> = {
      'New Order': 'notificationsNewOrder',
      'Order Created': 'notificationsNewOrder',
      'Order Assigned': 'notificationsOrderAssigned',
      'New Order Assigned': 'notificationsOrderAssigned',
      'Delivery Assigned': 'notificationsOrderAssigned',
      'Order Status Changed': 'notificationsStatusChanged',
      'Order Status Updated': 'notificationsStatusChanged',
      'Order Cancelled': 'notificationsOrderCancelled',
    };

    // Translate title
    let titleKey = notification.Title;
    
    // Check if it's an old English title that needs mapping
    if (titleMap[notification.Title]) {
      titleKey = titleMap[notification.Title];
    } else if (notification.Title.startsWith('notifications.')) {
      // New format: "notifications.newOrder" → "notificationsNewOrder"
      titleKey = notification.Title.replace('notifications.', 'notifications');
      titleKey = titleKey.charAt(0).toLowerCase() + titleKey.slice(1);
      titleKey = titleKey.replace(/\./g, '');
    }
    
    const title = t(titleKey as any) || notification.Title;
    
    // Parse message - handle both old and new formats
    let orderNumber = notification.Message;
    let statusKey = '';
    
    // Check if message contains '|' (new format: "orderNumber|statusKey")
    if (notification.Message.includes('|')) {
      const parts = notification.Message.split('|');
      orderNumber = parts[0];
      statusKey = parts[1] || '';
    } else {
      // Extract order number from old format messages like "Order 26-200-000001 has been..."
      const orderMatch = notification.Message.match(/\d{2}-\d{3}-\d{6}/);
      if (orderMatch) {
        orderNumber = orderMatch[0];
      }
    }
    
    let message = '';
    if (statusKey) {
      // Translate status key
      const statusTranslationKey = statusKey.replace('status.', 'status');
      const status = t(statusTranslationKey as any) || statusKey;
      message = language === 'ar' 
        ? `${status} - #${orderNumber} طلب`
        : `Commande ${orderNumber} - ${status}`;
    } else {
      message = language === 'ar'
        ? `#${orderNumber} طلب`
        : `Commande #${orderNumber}`;
    }
    
    return { title, message };
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.IsRead) {
      markAsReadMutation.mutate(notification.Id);
    }
  };

  if (!customerId) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute end-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg z-50 border">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{t('notifications')}</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <CheckCheck className="h-4 w-4" />
                  {t('markAllAsRead')}
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {t('noNotifications')}
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification: Notification) => {
                    const { title, message } = translateNotification(notification);
                    return (
                      <div
                        key={notification.Id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-all ${
                          !notification.IsRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.Type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className={`text-sm font-semibold ${!notification.IsRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                {title}
                              </p>
                              {!notification.IsRead && (
                                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {message}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500">
                                {formatDate(notification.DateCreated)}
                              </p>
                              {!notification.IsRead && (
                                <button
                                  className="text-xs text-blue-600 hover:text-blue-700 p-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsReadMutation.mutate(notification.Id);
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
