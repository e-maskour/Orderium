/**
 * Professional Notification Bell Component
 * Inspired by SAP Fiori, Odoo, and Microsoft Dynamics 365
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Archive,
  Settings,
  Eye,
  Clock,
  AlertCircle,
  Info,
  AlertTriangle,
  XOctagon,
  Package,
  TruckIcon,
  DollarSign,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastArchived } from '../services/toast.service';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { TabView, TabPanel } from 'primereact/tabview';
import { Divider } from 'primereact/divider';
import { Badge } from 'primereact/badge';
import {
  notificationsService,
  type INotification,
  NotificationType,
  NotificationPriority,
} from '../modules/notifications';
import { useLanguage } from '../context/LanguageContext';

export function NotificationBellPro() {
  const { t, dir } = useLanguage();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = unread, 1 = all
  const opRef = useRef<OverlayPanel>(null);

  const activeTabKey = activeTab === 0 ? 'unread' : 'all';

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', activeTabKey],
    queryFn: () =>
      notificationsService.getNotifications(
        { isRead: activeTabKey === 'unread' ? false : undefined },
        { page: 1, limit: 20, sortBy: 'dateCreated', sortOrder: 'DESC' }
      ),
    enabled: !!admin && isOpen,
    refetchInterval: isOpen ? 10000 : false,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.getUnreadCount(),
    enabled: !!admin,
    refetchInterval: 15000,
  });

  const notifications = notificationsData?.data || [];
  const unreadCount = unreadData?.count || 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead({ isRead: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toastSuccess(t('allNotificationsMarkedAsRead'));
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id: number) => notificationsService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toastArchived(t('notificationArchived'));
    },
  });

  const getNotificationIconStyle = (type: NotificationType): React.CSSProperties => {
    const colorMap: Record<NotificationType, { bg: string; color: string }> = {
      [NotificationType.NEW_ORDER]: { bg: '#dcfce7', color: '#15803d' },
      [NotificationType.ORDER_ASSIGNED]: { bg: '#dbeafe', color: '#1d4ed8' },
      [NotificationType.ORDER_STATUS_CHANGED]: { bg: '#fef3c7', color: '#b45309' },
      [NotificationType.DELIVERY_STATUS_UPDATE]: { bg: '#f3e8ff', color: '#7c3aed' },
      [NotificationType.ORDER_CANCELLED]: { bg: '#fef2f2', color: '#b91c1c' },
      [NotificationType.PAYMENT_RECEIVED]: { bg: '#d1fae5', color: '#047857' },
      [NotificationType.LOW_STOCK]: { bg: '#ffedd5', color: '#c2410c' },
      [NotificationType.SYSTEM]: { bg: '#f3f4f6', color: '#374151' },
      [NotificationType.INFO]: { bg: '#e0f2fe', color: '#0369a1' },
      [NotificationType.WARNING]: { bg: '#fef9c3', color: '#a16207' },
      [NotificationType.ERROR]: { bg: '#ffe4e6', color: '#be123c' },
    };
    const c = colorMap[type];
    return { padding: '0.625rem', borderRadius: '0.5rem', background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  };

  const getNotificationIcon = (type: NotificationType) => {
    const s = { width: 20, height: 20 };
    const iconMap: Record<NotificationType, JSX.Element> = {
      [NotificationType.NEW_ORDER]: <Package style={s} />,
      [NotificationType.ORDER_ASSIGNED]: <TruckIcon style={s} />,
      [NotificationType.ORDER_STATUS_CHANGED]: <Clock style={s} />,
      [NotificationType.DELIVERY_STATUS_UPDATE]: <TruckIcon style={s} />,
      [NotificationType.ORDER_CANCELLED]: <XOctagon style={s} />,
      [NotificationType.PAYMENT_RECEIVED]: <DollarSign style={s} />,
      [NotificationType.LOW_STOCK]: <AlertTriangle style={s} />,
      [NotificationType.SYSTEM]: <Settings style={s} />,
      [NotificationType.INFO]: <Info style={s} />,
      [NotificationType.WARNING]: <AlertTriangle style={s} />,
      [NotificationType.ERROR]: <AlertCircle style={s} />,
    };
    return iconMap[type];
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    const labelMap: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: t('priority.low' as any),
      [NotificationPriority.MEDIUM]: t('priority.medium' as any),
      [NotificationPriority.HIGH]: t('priority.high' as any),
      [NotificationPriority.URGENT]: t('priority.urgent' as any),
    };

    if (priority === NotificationPriority.LOW) return null;

    const severityMap: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
      [NotificationPriority.MEDIUM]: 'info',
      [NotificationPriority.HIGH]: 'warning',
      [NotificationPriority.URGENT]: 'danger',
    };

    return (
      <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontWeight: 600, background: priority === NotificationPriority.URGENT ? '#fef2f2' : priority === NotificationPriority.HIGH ? '#fffbeb' : '#eff6ff', color: priority === NotificationPriority.URGENT ? '#b91c1c' : priority === NotificationPriority.HIGH ? '#b45309' : '#1d4ed8' }}>
        {labelMap[priority]}
      </span>
    );
  };

  const getNotificationTitle = (notification: INotification) => {
    const key = `notification.title.${notification.type.toLowerCase()}`;
    return t(key as any);
  };

  const getNotificationMessage = (notification: INotification) => {
    const key = `notification.message.${notification.type.toLowerCase()}`;
    let message = t(key as any);

    const replacements: Record<string, string> = {};
    if (notification.data) {
      Object.entries(notification.data).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          replacements[key] = String(value);
        }
      });
    }
    if (notification.orderNumber && !replacements.orderNumber) replacements.orderNumber = String(notification.orderNumber);
    if (notification.customerName && !replacements.customerName) replacements.customerName = String(notification.customerName);
    Object.entries(replacements).forEach(([key, value]) => {
      message = message.replaceAll(`{{${key}}}`, value);
    });
    message = message.replace(/\{\{\w+\}\}/g, '');
    message = message.replace(/\s{2,}/g, ' ').trim();
    message = message.replace(/\sde\s*$/i, '').replace(/\sمن\s*$/i, '').trim();
    return message;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return `${minutes}${t('minutesAgo' as any)}`;
    if (hours < 24) return `${hours}${t('hoursAgo' as any)}`;
    if (days < 7) return `${days}${t('daysAgo' as any)}`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: INotification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.orderId) {
      navigate(`/orders/${notification.orderId}`);
      opRef.current?.hide();
      setIsOpen(false);
    }
  };

  const hasUrgentNotifications = notifications.some(
    (n: INotification) => !n.isRead && n.priority === NotificationPriority.URGENT
  );

  const isRtl = dir === 'rtl';

  return (
    <>
      <Button
        text
        rounded
        aria-label={t('notifications')}
        className={hasUrgentNotifications ? 'animate-pulse' : ''}
        style={{ position: 'relative' }}
        onClick={(e) => { setIsOpen(true); opRef.current?.toggle(e); }}
      >
        <Bell style={{ width: 20, height: 20, color: hasUrgentNotifications ? '#ef4444' : undefined }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, height: 20, minWidth: 20, padding: '0 4px',
            borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 0 0 2px #fff',
            background: hasUrgentNotifications ? '#ef4444' : '#235ae4', color: '#fff',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <OverlayPanel
        ref={opRef}
        onHide={() => setIsOpen(false)}
        style={{ width: '26rem', maxWidth: 'calc(100vw - 1rem)', padding: 0 }}
        dir={dir}
      >
        {/* Header */}
        <div className="flex align-items-center justify-content-between" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
          <div className="flex align-items-center gap-2" style={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}>
            <Bell style={{ width: 16, height: 16, color: '#6b7280' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('notifications')}</span>
            {unreadCount > 0 && (
              <Badge value={unreadCount} severity="info" style={{ fontSize: '0.625rem' }} />
            )}
          </div>
          <div className="flex align-items-center gap-1">
            {unreadCount > 0 && (
              <Button
                text
                size="small"
                onClick={() => markAllAsReadMutation.mutate()}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                <CheckCheck style={{ width: 14, height: 14, marginRight: 4 }} />
                {t('markAllRead')}
              </Button>
            )}
            <Button
              text
              rounded
              size="small"
              onClick={() => { navigate('/notifications'); opRef.current?.hide(); setIsOpen(false); }}
              aria-label={t('settings')}
              style={{ width: 28, height: 28 }}
            >
              <Settings style={{ width: 14, height: 14 }} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
          <TabPanel header={unreadCount > 0 ? `${t('unread')} (${unreadCount})` : t('unread')}>
            <div style={{ maxHeight: '30rem', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div className="flex flex-column align-items-center justify-content-center" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Bell style={{ width: 32, height: 32, color: '#9ca3af' }} />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                    {t('noUnreadNotifications' as any)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {t('allCaughtUp' as any)}
                  </span>
                </div>
              ) : (
                <div>
                  {notifications.map((notification: INotification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        position: 'relative', padding: '0.75rem 1rem', cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                        background: !notification.isRead ? '#f0f9ff' : 'transparent',
                      }}
                    >
                      {!notification.isRead && (
                        <div style={{ position: 'absolute', top: 0, bottom: 0, width: 3, background: '#235ae4', ...(isRtl ? { right: 0 } : { left: 0 }) }} />
                      )}
                      <div className="flex align-items-start gap-3" style={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                        <div style={getNotificationIconStyle(notification.type)}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: isRtl ? 'right' : 'left' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: !notification.isRead ? 500 : 400, color: !notification.isRead ? '#111827' : '#6b7280', lineHeight: 1.3 }}>
                            {getNotificationTitle(notification)}
                          </div>
                          <div className="line-clamp-2" style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.5, marginTop: '0.125rem' }}>
                            {getNotificationMessage(notification)}
                          </div>
                          <div className="flex align-items-center justify-content-between" style={{ marginTop: '0.25rem', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                            <div className="flex align-items-center gap-1" style={{ fontSize: '0.6875rem', color: '#9ca3af', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                              <Clock style={{ width: 12, height: 12 }} />
                              <span>{formatDate(notification.dateCreated)}</span>
                            </div>
                            <div className="flex align-items-center gap-1">
                              {!notification.isRead && (
                                <Button
                                  text
                                  rounded
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); markAsReadMutation.mutate(notification.id); }}
                                  aria-label={t('markAsRead')}
                                  style={{ width: 28, height: 28 }}
                                >
                                  <Check style={{ width: 14, height: 14 }} />
                                </Button>
                              )}
                              <Button
                                text
                                rounded
                                size="small"
                                onClick={(e) => { e.stopPropagation(); archiveMutation.mutate(notification.id); }}
                                aria-label={t('archive')}
                                style={{ width: 28, height: 28 }}
                              >
                                <Archive style={{ width: 14, height: 14 }} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabPanel>
          <TabPanel header={t('all')}>
            <div style={{ maxHeight: '30rem', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div className="flex flex-column align-items-center justify-content-center" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Bell style={{ width: 32, height: 32, color: '#9ca3af' }} />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                    {t('noNotificationsYet' as any)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {t('notifyWhenSomethingHappens' as any)}
                  </span>
                </div>
              ) : (
                <div>
                  {notifications.map((notification: INotification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        position: 'relative', padding: '0.75rem 1rem', cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                        background: !notification.isRead ? '#f0f9ff' : 'transparent',
                      }}
                    >
                      {!notification.isRead && (
                        <div style={{ position: 'absolute', top: 0, bottom: 0, width: 3, background: '#235ae4', ...(isRtl ? { right: 0 } : { left: 0 }) }} />
                      )}
                      <div className="flex align-items-start gap-3" style={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                        <div style={getNotificationIconStyle(notification.type)}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: isRtl ? 'right' : 'left' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: !notification.isRead ? 500 : 400, color: !notification.isRead ? '#111827' : '#6b7280', lineHeight: 1.3 }}>
                            {getNotificationTitle(notification)}
                          </div>
                          <div className="line-clamp-2" style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.5, marginTop: '0.125rem' }}>
                            {getNotificationMessage(notification)}
                          </div>
                          <div className="flex align-items-center justify-content-between" style={{ marginTop: '0.25rem', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                            <div className="flex align-items-center gap-1" style={{ fontSize: '0.6875rem', color: '#9ca3af', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                              <Clock style={{ width: 12, height: 12 }} />
                              <span>{formatDate(notification.dateCreated)}</span>
                            </div>
                            <div className="flex align-items-center gap-1">
                              {!notification.isRead && (
                                <Button
                                  text
                                  rounded
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); markAsReadMutation.mutate(notification.id); }}
                                  aria-label={t('markAsRead')}
                                  style={{ width: 28, height: 28 }}
                                >
                                  <Check style={{ width: 14, height: 14 }} />
                                </Button>
                              )}
                              <Button
                                text
                                rounded
                                size="small"
                                onClick={(e) => { e.stopPropagation(); archiveMutation.mutate(notification.id); }}
                                aria-label={t('archive')}
                                style={{ width: 28, height: 28 }}
                              >
                                <Archive style={{ width: 14, height: 14 }} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabPanel>
        </TabView>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Divider style={{ margin: 0 }} />
            <div style={{ padding: '0.5rem' }}>
              <Button
                text
                label={t('viewAllNotifications' as any)}
                icon={<Eye style={{ width: 16, height: 16, marginRight: 8 }} />}
                onClick={() => { navigate('/notifications'); opRef.current?.hide(); setIsOpen(false); }}
                style={{ width: '100%', fontSize: '0.875rem', fontWeight: 500, justifyContent: 'center' }}
              />
            </div>
          </>
        )}
      </OverlayPanel>
    </>
  );
}
