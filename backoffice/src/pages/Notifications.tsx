/**
 * Notifications Page - Professional notification management interface
 * Inspired by enterprise ERP systems (SAP, Odoo, Dynamics 365)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Search,
  Filter,
  CheckCheck,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Download,
  MoreVertical,
  Check,
  X,
  Package,
  TruckIcon,
  Clock,
  AlertCircle,
  Info,
  AlertTriangle,
  XOctagon,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  notificationsService,
  type Notification,
  type NotificationStats,
  NotificationType,
  NotificationPriority,
} from '../modules/notifications';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, dir } = useLanguage();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('unread');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch notifications
  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: ['notifications', 'page', activeTab, selectedType, selectedPriority, searchTerm, currentPage],
    queryFn: () =>
      notificationsService.getNotifications(
        {
          isRead: activeTab === 'unread' ? false : activeTab === 'all' ? undefined : undefined,
          isArchived: activeTab === 'archived',
          type: selectedType !== 'all' ? (selectedType as NotificationType) : undefined,
          priority: selectedPriority !== 'all' ? (selectedPriority as NotificationPriority) : undefined,
          search: searchTerm || undefined,
        },
        { page: currentPage, limit: pageSize, sortBy: 'dateCreated', sortOrder: 'DESC' }
      ),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: () => notificationsService.getStats(),
  });

  const notifications = notificationsData?.data || [];
  const totalPages = notificationsData?.totalPages || 0;
  const total = notificationsData?.total || 0;

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markManyAsReadMutation = useMutation({
    mutationFn: (ids: number[]) => notificationsService.markManyAsRead(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`${data.updated} notifications marked as read`);
      setSelectedNotifications([]);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => notificationsService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification archived');
    },
  });

  const archiveManyMutation = useMutation({
    mutationFn: (ids: number[]) => notificationsService.archiveMany(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`${data.updated} notifications archived`);
      setSelectedNotifications([]);
    },
  });

  const deleteManyMutation = useMutation({
    mutationFn: (ids: number[]) => notificationsService.deleteMany(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`${data.deleted} notifications deleted`);
      setSelectedNotifications([]);
      setShowDeleteConfirm(false);
    },
  });

  // Helpers
  const getNotificationIcon = (type: NotificationType) => {
    const iconMap: Record<NotificationType, JSX.Element> = {
      [NotificationType.NEW_ORDER]: <Package className="w-5 h-5" />,
      [NotificationType.ORDER_ASSIGNED]: <TruckIcon className="w-5 h-5" />,
      [NotificationType.ORDER_STATUS_CHANGED]: <Clock className="w-5 h-5" />,
      [NotificationType.DELIVERY_STATUS_UPDATE]: <TruckIcon className="w-5 h-5" />,
      [NotificationType.ORDER_CANCELLED]: <XOctagon className="w-5 h-5" />,
      [NotificationType.PAYMENT_RECEIVED]: <DollarSign className="w-5 h-5" />,
      [NotificationType.LOW_STOCK]: <AlertTriangle className="w-5 h-5" />,
      [NotificationType.SYSTEM]: <Settings className="w-5 h-5" />,
      [NotificationType.INFO]: <Info className="w-5 h-5" />,
      [NotificationType.WARNING]: <AlertTriangle className="w-5 h-5" />,
      [NotificationType.ERROR]: <AlertCircle className="w-5 h-5" />,
    };
    return iconMap[type];
  };

  const getNotificationColor = (type: NotificationType) => {
    const colorMap: Record<NotificationType, string> = {
      [NotificationType.NEW_ORDER]: 'bg-green-100 text-green-700',
      [NotificationType.ORDER_ASSIGNED]: 'bg-blue-100 text-blue-700',
      [NotificationType.ORDER_STATUS_CHANGED]: 'bg-amber-100 text-amber-700',
      [NotificationType.DELIVERY_STATUS_UPDATE]: 'bg-purple-100 text-purple-700',
      [NotificationType.ORDER_CANCELLED]: 'bg-red-100 text-red-700',
      [NotificationType.PAYMENT_RECEIVED]: 'bg-emerald-100 text-emerald-700',
      [NotificationType.LOW_STOCK]: 'bg-orange-100 text-orange-700',
      [NotificationType.SYSTEM]: 'bg-gray-100 text-gray-700',
      [NotificationType.INFO]: 'bg-sky-100 text-sky-700',
      [NotificationType.WARNING]: 'bg-yellow-100 text-yellow-700',
      [NotificationType.ERROR]: 'bg-rose-100 text-rose-700',
    };
    return colorMap[type];
  };

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
    if (days < 7) return `${days}${t('daysAgo')}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper to get translated notification title
  const getNotificationTitle = (notification: Notification): string => {
    const titleKey = `notification.title.${notification.type}` as any;
    return t(titleKey);
  };

  //  Helper to interpolate message with data
  const getNotificationMessage = (notification: Notification): string => {
    const messageKey = `notification.message.${notification.type}` as any;
    let message = t(messageKey);
    
    // Interpolate placeholders with data
    const replacements: Record<string, string> = {};

    if (notification.data) {
      Object.entries(notification.data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
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

  const toggleSelectNotification = (id: number) => {
    setSelectedNotifications((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map((n: Notification) => n.id));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  return (
    <AdminLayout>
        <div
            dir={dir}
            className={cn(
              'min-h-[calc(100vh-64px)] flex flex-col max-w-7xl mx-auto w-full',
              dir === 'rtl' ? 'text-right' : 'text-left'
            )}
        >
            <div className="flex-shrink-0">
                <PageHeader
                    icon={Bell}
                    title={t('notifications')}
                    subtitle={t('manageNotifications')}
                />
            </div>

            <div className="p-2 space-y-3">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                    <CardDescription>{t('totalNotifications')}</CardDescription>
                    <CardTitle className="text-3xl">{stats?.total || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                    <CardDescription>{t('unread')}</CardDescription>
                    <CardTitle className="text-3xl text-primary">{stats?.unread || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                    <CardDescription>{t('today')}</CardDescription>
                    <CardTitle className="text-3xl">{stats?.today || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                    <CardDescription>{t('thisWeek')}</CardDescription>
                    <CardTitle className="text-3xl">{stats?.thisWeek || 0}</CardTitle>
                    </CardHeader>
                </Card>
                </div>

                {/* Main Content */}
                <Card className="bg-white border border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <CardTitle>{t('allNotifications')}</CardTitle>
                        <CardDescription>{t('viewAndManageHistory')}</CardDescription>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('searchNotifications')}
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                        </div>

                        <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder={t('allTypes')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allTypes')}</SelectItem>
                            <SelectItem value={NotificationType.NEW_ORDER}>{t('newOrders')}</SelectItem>
                            <SelectItem value={NotificationType.ORDER_ASSIGNED}>{t('assigned')}</SelectItem>
                            <SelectItem value={NotificationType.ORDER_STATUS_CHANGED}>{t('statusChanged')}</SelectItem>
                            <SelectItem value={NotificationType.PAYMENT_RECEIVED}>{t('payments')}</SelectItem>
                        </SelectContent>
                        </Select>

                        <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                        <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allPriority')}</SelectItem>
                            <SelectItem value={NotificationPriority.URGENT}>{t('urgent')}</SelectItem>
                            <SelectItem value={NotificationPriority.HIGH}>{t('high')}</SelectItem>
                            <SelectItem value={NotificationPriority.MEDIUM}>{t('medium')}</SelectItem>
                            <SelectItem value={NotificationPriority.LOW}>{t('low')}</SelectItem>
                        </SelectContent>
                        </Select>

                        <Button variant="outline" size="icon" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Bulk Actions */}
                    {selectedNotifications.length > 0 && (
                    <div className="flex items-center justify-between p-4 mb-4 bg-muted rounded-lg">
                        <span className="text-sm font-medium">
                        {selectedNotifications.length} {t('selected')}
                        </span>
                        <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markManyAsReadMutation.mutate(selectedNotifications)}
                        >
                            <CheckCheck className="h-4 w-4 mr-2" />
                            {t('markAsRead')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => archiveManyMutation.mutate(selectedNotifications)}
                        >
                            <Archive className="h-4 w-4 mr-2" />
                            {t('archive')}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedNotifications([])}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>
                    )}

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="unread">
                        {t('unread')} {stats?.unread ? `(${stats.unread})` : ''}
                        </TabsTrigger>
                        <TabsTrigger value="all">{t('all')}</TabsTrigger>
                        <TabsTrigger value="archived">{t('archived')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-6">
                        {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                        ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium text-muted-foreground">{t('noNotificationsFound')}</p>
                            <p className="text-sm text-muted-foreground">
                            {activeTab === 'unread' ? t('allCaughtUp') : t('tryAdjustingFilters')}
                            </p>
                        </div>
                        ) : (
                        <div className="space-y-2">
                            {/* Select All */}
                            <div className="flex items-center px-4 py-2 border-b">
                            <input
                                type="checkbox"
                                checked={selectedNotifications.length === notifications.length}
                                onChange={toggleSelectAll}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="ml-3 text-sm text-muted-foreground">{t('selectAll')}</span>
                            </div>

                            {/* Notification List */}
                            <div className="divide-y">
                            {notifications.map((notification: Notification) => (
                                <div
                                key={notification.id}
                                className={cn(
                                    'group flex items-start gap-4 p-4 hover:bg-accent/50 cursor-pointer transition-all',
                                    !notification.isRead && 'bg-accent/20'
                                )}
                                onClick={() => handleNotificationClick(notification)}
                                >
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={selectedNotifications.includes(notification.id)}
                                    onChange={(e) => {
                                    e.stopPropagation();
                                    toggleSelectNotification(notification.id);
                                    }}
                                    className="mt-1 h-4 w-4 rounded border-gray-300"
                                />

                                {/* Icon */}
                                <div className={cn('p-2.5 rounded-lg', getNotificationColor(notification.type))}>
                                    {getNotificationIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={cn(
                                      'flex items-start justify-between gap-2',
                                      dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                                    )}
                                  >
                                    <div className="flex-1">
                                        <p className={cn(
                                        'text-sm font-semibold',
                                        !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                                        )}>
                                        {getNotificationTitle(notification)}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                        {getNotificationMessage(notification)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                        {formatDate(notification.dateCreated)}
                                        </p>
                                    </div>

                                    {/* Priority Badge */}
                                    {notification.priority !== NotificationPriority.LOW && (
                                        <Badge
                                        variant={
                                            notification.priority === NotificationPriority.URGENT
                                            ? 'destructive'
                                            : notification.priority === NotificationPriority.HIGH
                                            ? 'outline'
                                            : 'default'
                                        }
                                        className="text-xs"
                                        >
                                        {t(notification.priority as any)}
                                        </Badge>
                                    )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    {!notification.isRead && (
                                        <DropdownMenuItem
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            markAsReadMutation.mutate(notification.id);
                                        }}
                                        >
                                        <Check className="h-4 w-4 mr-2" />
                                        {t('markAsRead')}
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        archiveMutation.mutate(notification.id);
                                        }}
                                    >
                                        <Archive className="h-4 w-4 mr-2" />
                                        {t('archive')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setSelectedNotifications([notification.id]);
                                        setShowDeleteConfirm(true);
                                        }}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t('delete')}
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                </div>
                            ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                {t('showing')} {((currentPage - 1) * pageSize) + 1} {t('to')}{' '}
                                {Math.min(currentPage * pageSize, total)} {t('of')}{' '}
                                {total} {t('results')}
                                </p>
                                <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    {t('previous')}
                                </Button>
                                <span className="text-sm">
                                    {t('page')} {currentPage} {t('of')} {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    {t('next')}
                                </Button>
                                </div>
                            </div>
                            )}
                        </div>
                        )}
                    </TabsContent>
                    </Tabs>
                </CardContent>
                </Card>
            </div>
        </div>

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={() => deleteManyMutation.mutate(selectedNotifications)}
            title="Delete Notifications"
            message={`Are you sure you want to delete ${selectedNotifications.length} notification(s)? This action cannot be undone.`}
        />
    </AdminLayout>
  );
}
