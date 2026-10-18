import { useState, useMemo } from 'react';
import { Search, CheckCheck } from 'lucide-react';
import { Tabs } from '../components/ui';
import { Button } from 'primereact/button';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import {
  NOTIFICATION_TAB_TYPES,
  type NotificationTab,
} from '../modules/notifications/notifications.interface';
import type { Notification } from '../modules/notifications/notifications.model';
import { NotificationItem } from '../components/notifications/NotificationItem';

const TABS: NotificationTab[] = ['all', 'unread', 'orders', 'stock', 'payments', 'team'];

const TAB_I18N: Record<NotificationTab, string> = {
  all: 'tabAll',
  unread: 'tabUnread',
  orders: 'tabOrders',
  stock: 'tabStock',
  payments: 'tabPayments',
  team: 'tabTeam',
};

type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'older';

function getDateGroup(dateString: string): DateGroup {
  const now = new Date();
  const created = new Date(dateString);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - today.getDay());

  if (created >= today) return 'today';
  if (created >= yesterday) return 'yesterday';
  if (created >= weekStart) return 'thisWeek';
  return 'older';
}

const DATE_GROUP_I18N: Record<DateGroup, string> = {
  today: 'dateToday',
  yesterday: 'dateYesterday',
  thisWeek: 'dateThisWeek',
  older: 'dateOlder',
};

const DATE_GROUP_ORDER: DateGroup[] = ['today', 'yesterday', 'thisWeek', 'older'];

export default function Notifications() {
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();

  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Tab filter
    if (activeTab === 'unread') {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (activeTab !== 'all') {
      const types = NOTIFICATION_TAB_TYPES[activeTab];
      if (types) filtered = filtered.filter((n) => types.includes(n.type as any));
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (n) => n.title.toLowerCase().includes(term) || n.message.toLowerCase().includes(term),
      );
    }

    return filtered;
  }, [notifications, activeTab, searchTerm]);

  // Group by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<DateGroup, Notification[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };
    filteredNotifications.forEach((n) => {
      const group = getDateGroup(n.dateCreated);
      groups[group].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  const unreadTabCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  return (
    <AdminLayout>
      <div dir={dir} style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <PageHeader
          title={t('notifications')}
          subtitle={t('notificationsSubtitle')}
          actions={
            unreadCount > 0 ? (
              <Button
                outlined
                icon={<CheckCheck aria-hidden="true" />}
                label={t('markAllRead')}
                onClick={() => markAllRead()}
              />
            ) : undefined
          }
        />

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              ...(isRtl ? { right: 14 } : { left: 14 }),
              width: 18,
              height: 18,
              color: '#9ca3af',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchNotifications')}
            dir={dir}
            style={{
              width: '100%',
              padding: '12px 14px',
              ...(isRtl ? { paddingRight: 44 } : { paddingLeft: 44 }),
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              fontSize: '0.875rem',
              color: '#111827',
              background: '#fff',
              outline: 'none',
              transition: 'border-color 150ms',
              minHeight: 44,
              boxSizing: 'border-box',
              textAlign: isRtl ? 'right' : 'left',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
        </div>

        {/* Filter Tabs */}
        <Tabs
          className="ui-tabs-wrap"
          ariaLabel={t('notifications')}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as NotificationTab)}
          tabs={TABS.map((tab) => ({
            key: tab,
            label: t(TAB_I18N[tab] as any),
            count: tab === 'unread' && unreadTabCount > 0 ? unreadTabCount : undefined,
          }))}
        />

        {/* Date-Grouped List */}
        {filteredNotifications.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4rem 2rem',
              border: '2px dashed #d1d5db',
              borderRadius: 16,
              marginTop: '1rem',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>🔔</span>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>
              {t('emptyTitle')}
            </span>
            <span
              style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                marginTop: 6,
                textAlign: 'center',
                maxWidth: 320,
              }}
            >
              {t('emptySubtitle')}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {DATE_GROUP_ORDER.map((group) => {
              const items = groupedNotifications[group];
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  {/* Date group label */}
                  <div style={{ marginBottom: 8, textAlign: isRtl ? 'right' : 'left' }}>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: '#9ca3af',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {t(DATE_GROUP_I18N[group] as any)}
                    </span>
                  </div>

                  {/* Notifications container */}
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      overflow: 'hidden',
                    }}
                  >
                    {items.map((notification: Notification, idx: number) => (
                      <div
                        key={notification.id}
                        style={idx < items.length - 1 ? { borderBottom: '1px solid #f3f4f6' } : {}}
                      >
                        <NotificationItem
                          notification={notification}
                          onMarkRead={markAsRead}
                          fullText
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
