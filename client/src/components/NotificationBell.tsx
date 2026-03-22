import { useState, useRef } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { TranslationKey } from '@/lib/i18n';
import { OverlayPanel } from 'primereact/overlaypanel';
import { http } from '@/services/httpClient';

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
  const { user } = useAuth();
  const { t, language, dir } = useLanguage();
  const op = useRef<OverlayPanel>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'customer', customerId],
    queryFn: async () => {
      const res = await http<{ data: Notification[] }>(`/api/notifications?userType=customer&customerId=${customerId}`);
      return res.data ?? [];
    },
    enabled: !!customerId,
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'customer', customerId, 'unread-count'],
    queryFn: async () => {
      const res = await http<{ data: { count: number } }>(`/api/notifications/unread-count?userType=customer&customerId=${customerId}`);
      return res.data ?? { count: 0 };
    },
    enabled: !!customerId,
    refetchInterval: 10000,
  });

  const unreadCount = unreadData?.count || 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return http(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return http('/api/notifications/mark-all-read', {
        method: 'POST',
        body: JSON.stringify({ userType: 'customer', customerId }),
      });
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
    const baseStyle: React.CSSProperties = { width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1rem' };
    switch (type) {
      case 'order_created':
        return <div style={{ ...baseStyle, background: '#22c55e' }}>🆕</div>;
      case 'order_assigned':
        return <div style={{ ...baseStyle, background: '#3b82f6' }}>📦</div>;
      case 'order_status_changed':
        return <div style={{ ...baseStyle, background: '#eab308' }}>🔄</div>;
      case 'order_cancelled':
        return <div style={{ ...baseStyle, background: '#ef4444' }}>❌</div>;
      default:
        return <div style={{ ...baseStyle, background: '#6b7280' }}>📬</div>;
    }
  };

  const translateNotification = (notification: Notification) => {
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

    let titleKey = notification.Title;
    if (titleMap[notification.Title]) {
      titleKey = titleMap[notification.Title];
    } else if (notification.Title.startsWith('notifications.')) {
      titleKey = notification.Title.replace('notifications.', 'notifications');
      titleKey = titleKey.charAt(0).toLowerCase() + titleKey.slice(1);
      titleKey = titleKey.replace(/\./g, '');
    }

    const title = t(titleKey as TranslationKey) || notification.Title;

    let orderNumber = notification.Message;
    let statusKey = '';

    if (notification.Message.includes('|')) {
      const parts = notification.Message.split('|');
      orderNumber = parts[0];
      statusKey = parts[1] || '';
    } else {
      const orderMatch = notification.Message.match(/\d{2}-\d{3}-\d{6}/);
      if (orderMatch) {
        orderNumber = orderMatch[0];
      }
    }

    let message = '';
    if (statusKey) {
      const statusTranslationKey = statusKey.replace('status.', 'status');
      const status = t(statusTranslationKey as TranslationKey) || statusKey;
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
    <div dir={dir}>
      <button
        className="cl-icon-btn p-overlay-badge"
        style={{ width: '2.25rem', height: '2.25rem', position: 'relative' }}
        onClick={(e) => op.current?.toggle(e)}
        aria-label={t('notifications')}
      >
        <Bell style={{ width: '1.25rem', height: '1.25rem' }} />
        {unreadCount > 0 && (
          <span
            className="absolute flex align-items-center justify-content-center border-round-xl font-bold"
            style={{ top: '-0.25rem', insetInlineEnd: '-0.25rem', minWidth: '1.125rem', height: '1.125rem', padding: '0 0.2rem', background: '#ef4444', color: 'white', fontSize: '0.6rem' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <OverlayPanel ref={op} style={{ width: '20rem', maxWidth: 'calc(100vw - 2rem)' }} dir={dir}>
        <div className="flex align-items-center justify-content-between pb-3 mb-3 border-bottom-1 surface-border">
          <h3 className="font-semibold text-color m-0">{t('notifications')}</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem' }}
            >
              <CheckCheck style={{ width: '0.875rem', height: '0.875rem' }} />
              {t('markAllAsRead')}
            </button>
          )}
        </div>
        <div style={{ maxHeight: '25rem', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-color-secondary">
              {t('noNotifications')}
            </div>
          ) : (
            notifications.map((notification: Notification) => {
              const { title, message } = translateNotification(notification);
              return (
                <div
                  key={notification.Id}
                  onClick={() => handleNotificationClick(notification)}
                  className="cursor-pointer p-3 border-round-lg mb-1"
                  style={{
                    background: !notification.IsRead ? '#eff6ff' : 'transparent',
                    borderLeft: !notification.IsRead ? '4px solid #3b82f6' : '4px solid transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <div className="flex align-items-start gap-2">
                    {getNotificationIcon(notification.Type)}
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div className="flex align-items-center justify-content-between gap-2 mb-1">
                        <p className="text-sm font-semibold m-0" style={{ color: !notification.IsRead ? '#111827' : '#4b5563' }}>
                          {title}
                        </p>
                        {!notification.IsRead && (
                          <span className="animate-pulse border-circle flex-shrink-0" style={{ width: '0.625rem', height: '0.625rem', background: '#3b82f6' }} />
                        )}
                      </div>
                      <p className="text-sm text-color-secondary m-0 mb-2">{message}</p>
                      <div className="flex align-items-center justify-content-between">
                        <p className="text-xs text-color-secondary m-0">{formatDate(notification.DateCreated)}</p>
                        {!notification.IsRead && (
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem', borderRadius: '50%', color: '#2563eb' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.Id);
                            }}
                          >
                            <Check style={{ width: '0.875rem', height: '0.875rem' }} />
                          </button>
                        )}
                      </div>
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
