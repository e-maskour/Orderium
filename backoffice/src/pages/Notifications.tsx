/**
 * Notifications Page - Professional notification management interface
 * Inspired by enterprise ERP systems (SAP, Odoo, Dynamics 365)
 */

import { useState, useRef } from 'react';
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
import { toastSuccess, toastDeleted, toastArchived, toastConfirm } from '../services/toast.service';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { TabView, TabPanel } from 'primereact/tabview';
import { Menu } from 'primereact/menu';
import { Checkbox } from 'primereact/checkbox';
import {
  notificationsService,
  type INotification,
  type NotificationStats,
  NotificationType,
  NotificationPriority,
} from '../modules/notifications';
import { useLanguage } from '../context/LanguageContext';

const tabMapping: Record<string, number> = { unread: 0, all: 1, archived: 2 };
const tabValues = ['unread', 'all', 'archived'] as const;

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, dir } = useLanguage();
  const menuRef = useRef<Menu>(null);
  const [menuNotification, setMenuNotification] = useState<INotification | null>(null);

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('unread');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);

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
      toastSuccess(t('notificationsMarkedAsRead').replace('{{count}}', String(data.updated)));
      setSelectedNotifications([]);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => notificationsService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toastArchived(t('notificationArchived'));
    },
  });

  const archiveManyMutation = useMutation({
    mutationFn: (ids: number[]) => notificationsService.archiveMany(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toastArchived(t('notificationsArchived').replace('{{count}}', String(data.updated)));
      setSelectedNotifications([]);
    },
  });

  const deleteManyMutation = useMutation({
    mutationFn: (ids: number[]) => notificationsService.deleteMany(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toastDeleted(t('notificationsDeleted').replace('{{count}}', String(data.deleted)));
      setSelectedNotifications([]);
    },
  });

  // Helpers
  const iconStyle = { width: '1.25rem', height: '1.25rem' };
  const getNotificationIcon = (type: NotificationType) => {
    const iconMap: Record<NotificationType, JSX.Element> = {
      [NotificationType.NEW_ORDER]: <Package style={iconStyle} />,
      [NotificationType.ORDER_ASSIGNED]: <TruckIcon style={iconStyle} />,
      [NotificationType.ORDER_STATUS_CHANGED]: <Clock style={iconStyle} />,
      [NotificationType.DELIVERY_STATUS_UPDATE]: <TruckIcon style={iconStyle} />,
      [NotificationType.ORDER_CANCELLED]: <XOctagon style={iconStyle} />,
      [NotificationType.PAYMENT_RECEIVED]: <DollarSign style={iconStyle} />,
      [NotificationType.LOW_STOCK]: <AlertTriangle style={iconStyle} />,
      [NotificationType.SYSTEM]: <Settings style={iconStyle} />,
      [NotificationType.INFO]: <Info style={iconStyle} />,
      [NotificationType.WARNING]: <AlertTriangle style={iconStyle} />,
      [NotificationType.ERROR]: <AlertCircle style={iconStyle} />,
    };
    return iconMap[type];
  };

  const getNotificationClassName = (type: NotificationType): string => {
    const classMap: Record<NotificationType, string> = {
      [NotificationType.NEW_ORDER]: 'notif-icon notif-icon--new_order',
      [NotificationType.ORDER_ASSIGNED]: 'notif-icon notif-icon--order_assigned',
      [NotificationType.ORDER_STATUS_CHANGED]: 'notif-icon notif-icon--order_status_changed',
      [NotificationType.DELIVERY_STATUS_UPDATE]: 'notif-icon notif-icon--delivery_status_update',
      [NotificationType.ORDER_CANCELLED]: 'notif-icon notif-icon--order_cancelled',
      [NotificationType.PAYMENT_RECEIVED]: 'notif-icon notif-icon--payment_received',
      [NotificationType.LOW_STOCK]: 'notif-icon notif-icon--low_stock',
      [NotificationType.SYSTEM]: 'notif-icon notif-icon--system',
      [NotificationType.INFO]: 'notif-icon notif-icon--info',
      [NotificationType.WARNING]: 'notif-icon notif-icon--warning',
      [NotificationType.ERROR]: 'notif-icon notif-icon--error',
    };
    return classMap[type] || 'notif-icon notif-icon--info';
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
  const getNotificationTitle = (notification: INotification): string => {
    const titleKey = `notification.title.${notification.type}` as any;
    return t(titleKey);
  };

  //  Helper to interpolate message with data
  const getNotificationMessage = (notification: INotification): string => {
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
      setSelectedNotifications(notifications.map((n: INotification) => n.id));
    }
  };

  const handleNotificationClick = (notification: INotification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const getNotificationMenuItems = (notification: INotification) => {
    const items: any[] = [];
    if (!notification.isRead) {
      items.push({
        label: t('markAsRead'),
        command: () => markAsReadMutation.mutate(notification.id),
      });
    }
    items.push({
      label: t('archive'),
      command: () => archiveMutation.mutate(notification.id),
    });
    items.push({ separator: true });
    items.push({
      label: t('delete'),
      command: () =>
        toastConfirm(
          t('deleteNotifications'),
          () => deleteManyMutation.mutate([notification.id]),
          { description: t('confirmDeleteMessage').replace('{{count}}', '1') }
        ),
    });
    return items;
  };

  const typeOptions = [
    { label: t('allTypes'), value: 'all' },
    { label: t('newOrders'), value: NotificationType.NEW_ORDER },
    { label: t('assigned'), value: NotificationType.ORDER_ASSIGNED },
    { label: t('statusChanged'), value: NotificationType.ORDER_STATUS_CHANGED },
    { label: t('payments'), value: NotificationType.PAYMENT_RECEIVED },
  ];

  const priorityOptions = [
    { label: t('allPriority'), value: 'all' },
    { label: t('urgent'), value: NotificationPriority.URGENT },
    { label: t('high'), value: NotificationPriority.HIGH },
    { label: t('medium'), value: NotificationPriority.MEDIUM },
    { label: t('low'), value: NotificationPriority.LOW },
  ];

  const notificationListContent = isLoading ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
      <RefreshCw className="animate-spin" style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} />
    </div>
  ) : notifications.length === 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
      <Bell style={{ width: '4rem', height: '4rem', color: '#9ca3af', marginBottom: '1rem' }} />
      <p style={{ fontSize: '1.125rem', fontWeight: 500, color: '#6b7280' }}>{t('noNotificationsFound')}</p>
      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
        {activeTab === 'unread' ? t('allCaughtUp') : t('tryAdjustingFilters')}
      </p>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Select All */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
        <Checkbox
          checked={selectedNotifications.length === notifications.length}
          onChange={toggleSelectAll}
        />
        <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>{t('selectAll')}</span>
      </div>

      {/* Notification List */}
      <div>
        {notifications.map((notification: INotification) => (
          <div
            key={notification.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              padding: '1rem',
              cursor: 'pointer',
              borderBottom: '1px solid #e5e7eb',
              ...(!notification.isRead ? { background: 'rgba(0,0,0,0.03)' } : {}),
            }}
            onClick={() => handleNotificationClick(notification)}
          >
            {/* Checkbox */}
            <Checkbox
              checked={selectedNotifications.includes(notification.id)}
              onChange={(e) => {
                e.originalEvent?.stopPropagation();
                toggleSelectNotification(notification.id);
              }}
              style={{ marginTop: '0.25rem' }}
            />

            {/* Icon */}
            <div className={getNotificationClassName(notification.type)}>
              {getNotificationIcon(notification.type)}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: !notification.isRead ? '#111827' : '#6b7280',
                  }}>
                    {getNotificationTitle(notification)}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {getNotificationMessage(notification)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                    {formatDate(notification.dateCreated)}
                  </p>
                </div>

                {/* Priority Badge */}
                {notification.priority !== NotificationPriority.LOW && (
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontWeight: 500,
                    ...(notification.priority === NotificationPriority.URGENT
                      ? { background: '#fef2f2', color: '#dc2626' }
                      : notification.priority === NotificationPriority.HIGH
                        ? { background: '#ffffff', color: '#374151', border: '1px solid #d1d5db' }
                        : { background: '#f3f4f6', color: '#374151' }),
                  }}>
                    {t(notification.priority as any)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <Button
              text
              icon={<MoreVertical style={{ width: '1rem', height: '1rem' }} />}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setMenuNotification(notification);
                menuRef.current?.toggle(e as any);
              }}
              aria-label={t('moreOptions')}
            />
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {t('showing')} {((currentPage - 1) * pageSize) + 1} {t('to')}{' '}
            {Math.min(currentPage * pageSize, total)} {t('of')}{' '}
            {total} {t('results')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Button
              outlined
              size="small"
              label={t('previous')}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            />
            <span style={{ fontSize: '0.875rem' }}>
              {t('page')} {currentPage} {t('of')} {totalPages}
            </span>
            <Button
              outlined
              size="small"
              label={t('next')}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <Menu ref={menuRef} model={menuNotification ? getNotificationMenuItems(menuNotification) : []} popup />
      <div
        dir={dir}
        style={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%',
          textAlign: dir === 'rtl' ? 'right' : 'left',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <PageHeader
            icon={Bell}
            title={t('notifications')}
            subtitle={t('manageNotifications')}
          />
        </div>

        <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderRadius: '0.5rem' }}>
              <div style={{ padding: '1.5rem', paddingBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{t('totalNotifications')}</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 700 }}>{stats?.total || 0}</p>
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderRadius: '0.5rem' }}>
              <div style={{ padding: '1.5rem', paddingBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{t('unread')}</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#235ae4' }}>{stats?.unread || 0}</p>
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderRadius: '0.5rem' }}>
              <div style={{ padding: '1.5rem', paddingBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{t('today')}</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 700 }}>{stats?.today || 0}</p>
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderRadius: '0.5rem' }}>
              <div style={{ padding: '1.5rem', paddingBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{t('thisWeek')}</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 700 }}>{stats?.thisWeek || 0}</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderRadius: '0.5rem' }}>
            {/* Header */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{t('allNotifications')}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{t('viewAndManageHistory')}</p>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#9ca3af' }} />
                    <label htmlFor="search-notifications" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>{t('searchNotifications')}</label>
                    <InputText
                      id="search-notifications"
                      placeholder={t('searchNotifications')}
                      value={String(searchTerm)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      style={{ width: '100%', paddingLeft: '2.25rem' }}
                    />
                  </div>

                  <Dropdown
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.value)}
                    options={typeOptions}
                    style={{ width: '150px' }}
                  />

                  <Dropdown
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.value)}
                    options={priorityOptions}
                    style={{ width: '130px' }}
                  />

                  <Button
                    outlined
                    icon={<RefreshCw style={{ width: '1rem', height: '1rem' }} />}
                    onClick={() => refetch()}
                    aria-label={t('refresh')}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              {/* Bulk Actions */}
              {selectedNotifications.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', marginBottom: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {selectedNotifications.length} {t('selected')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Button
                      outlined
                      size="small"
                      label={t('markAsRead')}
                      icon={<CheckCheck style={{ width: '1rem', height: '1rem' }} />}
                      onClick={() => markManyAsReadMutation.mutate(selectedNotifications)}
                    />
                    <Button
                      outlined
                      size="small"
                      label={t('archive')}
                      icon={<Archive style={{ width: '1rem', height: '1rem' }} />}
                      onClick={() => archiveManyMutation.mutate(selectedNotifications)}
                    />
                    <Button
                      severity="danger"
                      size="small"
                      label={t('delete')}
                      icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />}
                      onClick={() => toastConfirm(
                        t('deleteNotifications'),
                        () => deleteManyMutation.mutate(selectedNotifications),
                        { description: t('confirmDeleteMessage').replace('{{count}}', String(selectedNotifications.length)) }
                      )}
                    />
                    <Button
                      text
                      icon={<X style={{ width: '1rem', height: '1rem' }} />}
                      onClick={() => setSelectedNotifications([])}
                    />
                  </div>
                </div>
              )}

              {/* Tabs */}
              <TabView
                activeIndex={tabMapping[activeTab]}
                onTabChange={(e) => setActiveTab(tabValues[e.index] as any)}
              >
                <TabPanel header={`${t('unread')} ${stats?.unread ? `(${stats.unread})` : ''}`}>
                  {notificationListContent}
                </TabPanel>
                <TabPanel header={t('all')}>
                  {notificationListContent}
                </TabPanel>
                <TabPanel header={t('archived')}>
                  {notificationListContent}
                </TabPanel>
              </TabView>
            </div>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
}
