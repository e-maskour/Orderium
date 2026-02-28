/**
 * Professional INotification Bell Component
 * Inspired by SAP Fiori, Odoo, and Microsoft Dynamics 365
 */

import { useState } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  notificationsService,
  type INotification,
  NotificationType,
  NotificationPriority,
} from '../modules/notifications';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export function NotificationBellPro() {
  const { t, dir } = useLanguage();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', activeTab],
    queryFn: () =>
      notificationsService.getNotifications(
        { isRead: activeTab === 'unread' ? false : undefined },
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

  const getNotificationIcon = (type: NotificationType, priority: NotificationPriority) => {
    const iconSize = 'w-5 h-5';
    const iconMap: Record<NotificationType, JSX.Element> = {
      [NotificationType.NEW_ORDER]: <Package className={iconSize} />,
      [NotificationType.ORDER_ASSIGNED]: <TruckIcon className={iconSize} />,
      [NotificationType.ORDER_STATUS_CHANGED]: <Clock className={iconSize} />,
      [NotificationType.DELIVERY_STATUS_UPDATE]: <TruckIcon className={iconSize} />,
      [NotificationType.ORDER_CANCELLED]: <XOctagon className={iconSize} />,
      [NotificationType.PAYMENT_RECEIVED]: <DollarSign className={iconSize} />,
      [NotificationType.LOW_STOCK]: <AlertTriangle className={iconSize} />,
      [NotificationType.SYSTEM]: <Settings className={iconSize} />,
      [NotificationType.INFO]: <Info className={iconSize} />,
      [NotificationType.WARNING]: <AlertTriangle className={iconSize} />,
      [NotificationType.ERROR]: <AlertCircle className={iconSize} />,
    };

    const colorMap: Record<NotificationType, string> = {
      [NotificationType.NEW_ORDER]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      [NotificationType.ORDER_ASSIGNED]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      [NotificationType.ORDER_STATUS_CHANGED]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      [NotificationType.DELIVERY_STATUS_UPDATE]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      [NotificationType.ORDER_CANCELLED]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      [NotificationType.PAYMENT_RECEIVED]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      [NotificationType.LOW_STOCK]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      [NotificationType.SYSTEM]: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      [NotificationType.INFO]: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
      [NotificationType.WARNING]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      [NotificationType.ERROR]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    };

    return (
      <div className={cn('p-2.5 rounded-lg', colorMap[type])}>
        {iconMap[type]}
      </div>
    );
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    const variantMap: Record<NotificationPriority, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      [NotificationPriority.LOW]: 'secondary',
      [NotificationPriority.MEDIUM]: 'default',
      [NotificationPriority.HIGH]: 'outline',
      [NotificationPriority.URGENT]: 'destructive',
    };

    const labelMap: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: t('priority.low' as any),
      [NotificationPriority.MEDIUM]: t('priority.medium' as any),
      [NotificationPriority.HIGH]: t('priority.high' as any),
      [NotificationPriority.URGENT]: t('priority.urgent' as any),
    };

    if (priority === NotificationPriority.LOW) return null;

    return (
      <Badge variant={variantMap[priority]} className="text-[10px] px-1.5 py-0 h-4">
        {labelMap[priority]}
      </Badge>
    );
  };

  const getNotificationTitle = (notification: INotification) => {
    const key = `notification.title.${notification.type.toLowerCase()}`;
    return t(key as any);
  };

  const getNotificationMessage = (notification: INotification) => {
    const key = `notification.message.${notification.type.toLowerCase()}`;
    let message = t(key as any);

    // Interpolate placeholders with data
    const replacements: Record<string, string> = {};

    if (notification.data) {
      Object.entries(notification.data).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          replacements[key] = String(value);
        }
      });
    }

    if (notification.orderNumber && !replacements.orderNumber) {
      replacements.orderNumber = String(notification.orderNumber);
    }
    if (notification.customerName && !replacements.customerName) {
      replacements.customerName = String(notification.customerName);
    }

    Object.entries(replacements).forEach(([key, value]) => {
      message = message.replaceAll(`{{${key}}}`, value);
    });

    // Remove any remaining placeholders that weren't replaced
    message = message.replace(/\{\{\w+\}\}/g, '');

    // Cleanup trailing connectors when data is missing
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

    // Navigate to related resource
    if (notification.orderId) {
      navigate(`/orders/${notification.orderId}`);
      setIsOpen(false);
    }
  };

  const hasUrgentNotifications = notifications.some(
    (n: INotification) => !n.isRead && n.priority === NotificationPriority.URGENT
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('notifications')}
          className={cn(
            'relative hover:bg-accent transition-all duration-200',
            hasUrgentNotifications && 'animate-pulse'
          )}
        >
          <Bell className={cn('h-5 w-5', hasUrgentNotifications && 'text-red-500')} />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center shadow-lg ring-2 ring-background',
                hasUrgentNotifications
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-primary text-primary-foreground'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        dir={dir}
        className={cn(
          'w-[420px] p-0 shadow-2xl',
          dir === 'rtl' ? 'text-right' : 'text-left'
        )}
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b bg-muted/30',
            dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2',
              dir === 'rtl' ? 'flex-row-reverse justify-end' : 'flex-row'
            )}
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">{t('notifications')}</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                className="h-7 px-2 text-xs hover:bg-accent"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                {t('markAllRead')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
              className="h-7 w-7"
              aria-label={t('settings')}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'all' | 'unread')} className="w-full">
          <TabsList className="w-full rounded-none border-b bg-transparent p-0 h-10">
            <TabsTrigger
              value="unread"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              {t('unread')}
              {unreadCount > 0 && (
                <span className="ml-1.5 text-[10px] font-semibold">({unreadCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              {t('all')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="m-0">
            <ScrollArea className="h-[480px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {activeTab === 'unread' ? t('noUnreadNotifications' as any) : t('noNotificationsYet' as any)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'unread'
                      ? t('allCaughtUp' as any)
                      : t('notifyWhenSomethingHappens' as any)}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification: INotification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'group relative px-4 py-3 hover:bg-accent/50 cursor-pointer transition-all duration-200',
                        !notification.isRead && 'bg-accent/20'
                      )}
                    >
                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div
                          className={cn(
                            'absolute top-0 bottom-0 w-1 bg-primary',
                            dir === 'rtl' ? 'right-0' : 'left-0'
                          )}
                        />
                      )}

                      <div
                        className={cn(
                          'flex items-start gap-3',
                          dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                        )}
                      >
                        {/* Icon */}
                        {getNotificationIcon(notification.type, notification.priority)}

                        {/* Content */}
                        <div className={cn('flex-1 min-w-0 space-y-1', dir === 'rtl' ? 'text-right' : 'text-left')}>
                          <div
                            className={cn(
                              'flex items-start justify-between gap-2',
                              dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                            )}
                          >
                            <p
                              className={cn(
                                'text-sm font-medium leading-tight',
                                !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                              )}
                            >
                              {getNotificationTitle(notification)}
                            </p>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {getNotificationMessage(notification)}
                          </p>

                          <div
                            className={cn(
                              'flex items-center justify-between pt-1',
                              dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                            )}
                          >
                            <div
                              className={cn(
                                'flex items-center gap-2 text-[11px] text-muted-foreground',
                                dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                              )}
                            >
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(notification.dateCreated)}</span>
                            </div>

                            {/* Quick actions */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsReadMutation.mutate(notification.id);
                                  }}
                                  className="h-7 w-7"
                                  title={t('markAsRead')}
                                  aria-label={t('markAsRead')}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveMutation.mutate(notification.id);
                                }}
                                className="h-7 w-7"
                                title={t('archive')}
                                aria-label={t('archive')}
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full h-9 text-sm font-medium hover:bg-accent"
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                {t('viewAllNotifications' as any)}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
