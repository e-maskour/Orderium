import { useState, useMemo } from 'react';
import { Bell, Search, CheckCheck } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
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
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
            flexDirection: isRtl ? 'row-reverse' : 'row',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexDirection: isRtl ? 'row-reverse' : 'row',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell style={{ width: 24, height: 24, color: '#fff' }} />
            </div>
            <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                {t('notifications')}
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '2px 0 0' }}>
                {t('notificationsSubtitle')}
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexDirection: isRtl ? 'row-reverse' : 'row',
            }}
          >
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: '1px solid #2563eb',
                  background: '#fff',
                  color: '#2563eb',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  minHeight: 44,
                  flexDirection: isRtl ? 'row-reverse' : 'row',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                }}
              >
                <CheckCheck style={{ width: 16, height: 16 }} />
                {t('markAllRead')}
              </button>
            )}
          </div>
        </div>

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
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            borderRadius: 12,
            background: '#f3f4f6',
            marginBottom: '1.5rem',
            overflowX: 'auto',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flexShrink: 0,
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? '#fff' : 'transparent',
                  color: isActive ? '#111827' : '#6b7280',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 150ms',
                  minHeight: 36,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {t(TAB_I18N[tab] as any)}
                {tab === 'unread' && unreadTabCount > 0 && (
                  <span
                    style={{
                      background: isActive ? '#2563eb' : '#9ca3af',
                      color: '#fff',
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      borderRadius: 9999,
                      padding: '1px 6px',
                      minWidth: 18,
                      textAlign: 'center',
                    }}
                  >
                    {unreadTabCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

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
