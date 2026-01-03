import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { useSocket } from '../hooks/useSocket';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

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

export function NotificationBell() {
  const { admin } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const token = localStorage.getItem('adminToken');

  // Socket connection
  const { socket } = useSocket({
    token: token || undefined,
    userType: 'admin',
    autoConnect: !!admin && !!token,
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/notifications?userType=admin');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!admin,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'admin', 'unread-count'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/unread-count?userType=admin');
      if (!response.ok) throw new Error('Failed to fetch unread count');
      return response.json();
    },
    enabled: !!admin,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const unreadCount = unreadData?.count || 0;

  // Listen for real-time notifications
  useEffect(() => {
    if (!admin || !socket) return;

    const handleNewNotification = (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      const { title, message } = translateNotification(notification);
      toast.info(title, {
        description: message,
      });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [admin, queryClient, t]);

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
        body: JSON.stringify({ userType: 'admin' }),
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('allNotificationsMarkedAsRead') || 'All notifications marked as read');
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow') || 'Just now';
    if (minutes < 60) return `${minutes} ${t('minutesAgo') || 'm ago'}`;
    if (hours < 24) return `${hours} ${t('hoursAgo') || 'h ago'}`;
    return `${days} ${t('daysAgo') || 'd ago'}`;
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "w-10 h-10 rounded-full flex items-center justify-center text-white";
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
      'New Order': 'notifications.newOrder',
      'Order Assigned': 'notifications.orderAssigned',
      'Order Status Changed': 'notifications.statusChanged',
      'Order Status Updated': 'notifications.statusChanged',
      'Order Cancelled': 'notifications.orderCancelled',
      'Order Created': 'notifications.newOrder',
      'Delivery Assigned': 'notifications.orderAssigned',
      'New Order Assigned': 'notifications.orderAssigned',
    };
    
    const titleKey = titleMap[notification.Title] || notification.Title;
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
      const status = t(statusKey as any) || statusKey;
      message = language === 'ar'
        ? `${status} - #${orderNumber} ${t('order')}`
        : `${t('order')} ${orderNumber} - ${status}`;
    } else {
      message = language === 'ar'
        ? `#${orderNumber} ${t('order')}`
        : `${t('order')} #${orderNumber}`;
    }
    
    return { title, message };
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.IsRead) {
      markAsReadMutation.mutate(notification.Id);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{t('notifications') || 'Notifications'}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              {t('markAllRead') || 'Mark all read'}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('noNotifications') || 'No notifications'}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: Notification) => {
                const { title, message } = translateNotification(notification);
                return (
                  <div
                    key={notification.Id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-all ${
                      !notification.IsRead ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
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
                        <p className="text-sm text-muted-foreground mb-2">
                          {message}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(notification.DateCreated)}
                          </p>
                          {!notification.IsRead && (
                            <button
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
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
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
