import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toastSuccess } from '../services/toast.service';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { OverlayPanel } from 'primereact/overlaypanel';

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
  const { deliveryPerson } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const op = useRef<any>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'delivery', deliveryPerson?.id],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/notifications?userType=delivery&userId=${deliveryPerson?.id}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const json = await response.json();
      return json.data || [];
    },
    enabled: !!deliveryPerson,
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'delivery', deliveryPerson?.id, 'unread-count'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/notifications/unread-count?userId=${deliveryPerson?.id}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch unread count');
      const json = await response.json();
      return json.data || {};
    },
    enabled: !!deliveryPerson,
    refetchInterval: 10000,
  });

  const unreadCount = unreadData?.count || 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/notifications/mark-all-read?userId=${deliveryPerson?.id}`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toastSuccess(t('allNotificationsMarkedAsRead') || 'All notifications marked as read');
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
    if (minutes < 60) return `${minutes}${t('minutesAgo')}`;
    if (hours < 24) return `${hours}${t('hoursAgo')}`;
    return `${days}${t('daysAgo')}`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_created': return '🆕';
      case 'order_assigned': return '📦';
      case 'order_status_changed': return '🔄';
      case 'order_cancelled': return '❌';
      default: return '📬';
    }
  };

  const translateNotification = (notification: Notification) => {
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

    let orderNumber = notification.Message ?? '';
    let statusKey = '';

    if ((notification.Message ?? '').includes('|')) {
      const parts = (notification.Message ?? '').split('|');
      orderNumber = parts[0];
      statusKey = parts[1] || '';
    } else {
      const orderMatch = (notification.Message ?? '').match(/\d{2}-\d{3}-\d{6}/);
      if (orderMatch) {
        orderNumber = orderMatch[0];
      }
    }

    let message: string;
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

  return (
    <div className="relative">
      <Button
        icon="pi pi-bell"
        rounded
        text
        severity="secondary"
        onClick={(e) => op.current?.toggle(e)}
        className="p-overlay-badge"
        style={{ color: '#fff' }}
      >
        {unreadCount > 0 && (
          <Badge value={unreadCount > 9 ? '9+' : String(unreadCount)} severity="danger" />
        )}
      </Button>

      <OverlayPanel ref={op} style={{ width: '20rem' }}>
        <div className="flex align-items-center justify-content-between mb-3">
          <span className="font-bold">{t('notifications') || 'Notifications'}</span>
          {unreadCount > 0 && (
            <Button
              icon="pi pi-check-circle"
              label={t('markAllRead') || 'Mark all read'}
              text
              size="small"
              severity="info"
              onClick={() => markAllAsReadMutation.mutate()}
            />
          )}
        </div>

        <div style={{ maxHeight: '400px', overflow: 'auto' }} className="orderium-scrollbar">
          {notifications.length === 0 ? (
            <div className="text-center py-5" style={{ color: 'var(--orderium-text-muted)' }}>
              {t('noNotifications') || 'No notifications'}
            </div>
          ) : (
            notifications.map((notification: Notification, idx: number) => {
              const { title, message } = translateNotification(notification);
              return (
                <div
                  key={notification.Id ?? idx}
                  onClick={() => {
                    if (!notification.IsRead) markAsReadMutation.mutate(notification.Id);
                  }}
                  className="p-3 cursor-pointer border-round mb-1"
                  style={{
                    background: notification.IsRead ? 'transparent' : '#eff6ff',
                    borderLeft: notification.IsRead ? '3px solid transparent' : '3px solid #3b82f6',
                  }}
                >
                  <div className="flex align-items-start gap-2">
                    <span className="text-xl">{getNotificationIcon(notification.Type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex align-items-center justify-content-between gap-2 mb-1">
                        <span className="font-semibold text-sm">{title}</span>
                        {!notification.IsRead && (
                          <span className="border-circle" style={{ width: '8px', height: '8px', background: '#3b82f6', flexShrink: 0 }} />
                        )}
                      </div>
                      <p className="text-sm m-0 mb-1" style={{ color: 'var(--orderium-text-secondary)' }}>{message}</p>
                      <span className="text-xs" style={{ color: 'var(--orderium-text-muted)' }}>{formatDate(notification.DateCreated)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </OverlayPanel>
    </div>
  );
}
