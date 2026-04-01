import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import { http } from '@/services/httpClient';
import { notify } from '@orderium/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiNotification {
  Id: number;
  Title: string;
  Message: string;
  Type: string;
  OrderId?: number;
  OrderNumber?: string;
  IsRead: boolean;
  DateCreated: string;
}

type FilterType = 'all' | 'orders' | 'payment' | 'alerts';

interface NotificationBellProps {
  customerId?: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { emoji: string; bg: string; accent: string }> = {
  order_created: { emoji: '🛍️', bg: '#f0fdf4', accent: '#16a34a' },
  order_assigned: { emoji: '📦', bg: '#eff6ff', accent: '#3b82f6' },
  order_status_changed: { emoji: '🔄', bg: '#fffbeb', accent: '#d97706' },
  order_cancelled: { emoji: '❌', bg: '#fef2f2', accent: '#ef4444' },
  payment: { emoji: '💳', bg: '#faf5ff', accent: '#9333ea' },
  payment_confirmed: { emoji: '✅', bg: '#f0fdf4', accent: '#16a34a' },
  payment_failed: { emoji: '⚠️', bg: '#fef2f2', accent: '#ef4444' },
};

const FILTER_TYPES: Record<FilterType, string[]> = {
  all: [],
  orders: ['order_created', 'order_assigned', 'order_status_changed', 'order_cancelled'],
  payment: ['payment', 'payment_confirmed', 'payment_failed'],
  alerts: ['alert', 'system', 'warning'],
};

const FILTER_LABELS: Record<FilterType, TranslationKey> = {
  all: 'filterAll',
  orders: 'filterOrders',
  payment: 'filterPayment',
  alerts: 'filterAlerts',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(d: Date): boolean {
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function isYesterday(d: Date): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell({ customerId }: NotificationBellProps) {
  const queryClient = useQueryClient();
  const { t, language, dir } = useLanguage();
  const isRtl = dir === 'rtl';
  const prevUnreadRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  // ── Queries ──

  const { data: notifications = [] } = useQuery<ApiNotification[]>({
    queryKey: ['notifications', 'customer', customerId],
    queryFn: async () => {
      const res = await http<{ data: ApiNotification[] }>(`/api/notifications?userType=customer&customerId=${customerId}`);
      return res.data ?? [];
    },
    enabled: !!customerId,
    refetchInterval: 15000,
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

  const unreadCount = unreadData?.count ?? 0;

  // ── Toast on new notification ──

  useEffect(() => {
    if (prevUnreadRef.current > 0 && unreadCount > prevUnreadRef.current) {
      notify.info(t('notifications') as string, {
        description: t('newNotification') as string,
        duration: 4000,
      });
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // ── Keyboard + scroll lock ──

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── Mutations ──

  const markAsRead = useMutation({
    mutationFn: (id: number) => http(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: () => http('/api/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ userType: 'customer', customerId }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const dismiss = useMutation({
    mutationFn: (id: number) => http(`/api/notifications/${id}/archive`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const clearAll = useMutation({
    mutationFn: () => http('/api/notifications/archive-all', {
      method: 'POST',
      body: JSON.stringify({ userType: 'customer', customerId }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // ── Filter + group ──

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    const types = FILTER_TYPES[filter];
    return notifications.filter((n) => types.includes(n.Type));
  }, [notifications, filter]);

  const grouped = useMemo(() => {
    const today: ApiNotification[] = [];
    const yesterday: ApiNotification[] = [];
    const earlier: ApiNotification[] = [];
    for (const n of filtered) {
      const d = new Date(n.DateCreated);
      if (isToday(d)) today.push(n);
      else if (isYesterday(d)) yesterday.push(n);
      else earlier.push(n);
    }
    return { today, yesterday, earlier };
  }, [filtered]);

  // ── Helpers ──

  const typeConf = (type: string) => TYPE_CONFIG[type] ?? { emoji: '📬', bg: '#f9fafb', accent: '#6b7280' };

  const relativeTime = (ds: string): string => {
    const ms = Date.now() - new Date(ds).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (mins < 1) return t('justNow') as string;
    if (mins < 60) return (t('minutesAgo') as string).replace('{minutes}', String(mins));
    if (hrs < 24) return (t('hoursAgo') as string).replace('{hours}', String(hrs));
    if (days < 7) return (t('daysAgo') as string).replace('{days}', String(days));
    return new Date(ds).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', { day: 'numeric', month: 'short' });
  };

  const translateNotif = (n: ApiNotification) => {
    const titleMap: Record<string, TranslationKey> = {
      'New Order': 'notificationsNewOrder',
      'Order Created': 'notificationsNewOrder',
      'Order Assigned': 'notificationsOrderAssigned',
      'New Order Assigned': 'notificationsOrderAssigned',
      'Delivery Assigned': 'notificationsOrderAssigned',
      'Order Status Changed': 'notificationsStatusChanged',
      'Order Status Updated': 'notificationsStatusChanged',
      'Order Cancelled': 'notificationsOrderCancelled',
    };
    const title = (t((titleMap[n.Title] ?? n.Title) as TranslationKey) || n.Title) as string;

    let orderNumber = n.Message ?? '';
    let statusKey = '';
    if (orderNumber.includes('|')) {
      [orderNumber, statusKey] = orderNumber.split('|');
    } else {
      const m = orderNumber.match(/\d{2}-\d{3}-\d{6}/);
      if (m) orderNumber = m[0];
    }

    let message: string;
    if (statusKey) {
      const status = (t(statusKey.replace('status.', 'status') as TranslationKey) || statusKey) as string;
      message = language === 'ar' ? `${status} - #${orderNumber} طلب` : `Commande ${orderNumber} - ${status}`;
    } else {
      message = language === 'ar' ? `#${orderNumber} طلب` : `Commande #${orderNumber}`;
    }
    return { title, message };
  };

  // ── Sub-component: Group section ──

  const GroupSection = ({ label, items }: { label: string; items: ApiNotification[] }) => {
    if (!items.length) return null;
    return (
      <section>
        <div style={{
          padding: '0.75rem 1.25rem 0.375rem',
          fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          {label}
        </div>
        {items.map((n) => {
          const cfg = typeConf(n.Type);
          const { title, message } = translateNotif(n);
          return (
            <div
              key={n.Id}
              role="button"
              tabIndex={0}
              aria-label={title}
              onClick={() => { if (!n.IsRead) markAsRead.mutate(n.Id); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !n.IsRead) markAsRead.mutate(n.Id); }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                padding: '0.875rem 1.25rem',
                cursor: n.IsRead ? 'default' : 'pointer',
                background: n.IsRead ? 'transparent' : 'rgba(59,130,246,0.04)',
                borderBottom: '1px solid #f3f4f6',
                transition: 'background 0.15s',
                position: 'relative',
                outline: 'none',
              }}
              onMouseEnter={e => { if (n.IsRead) e.currentTarget.style.background = '#fafafa'; }}
              onMouseLeave={e => { e.currentTarget.style.background = n.IsRead ? 'transparent' : 'rgba(59,130,246,0.04)'; }}
            >
              {/* Unread accent bar */}
              {!n.IsRead && (
                <div style={{
                  position: 'absolute',
                  [isRtl ? 'right' : 'left']: 0,
                  top: '14px', bottom: '14px', width: '3px',
                  background: cfg.accent,
                  borderRadius: isRtl ? '3px 0 0 3px' : '0 3px 3px 0',
                }} />
              )}
              {/* Icon */}
              <div style={{
                width: '2.625rem', height: '2.625rem', borderRadius: '14px',
                background: cfg.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0,
              }}>
                {cfg.emoji}
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.875rem', lineHeight: 1.35,
                    fontWeight: n.IsRead ? 500 : 700,
                    color: n.IsRead ? '#374151' : '#111827',
                  }}>
                    {title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginTop: '1px' }}>
                    {!n.IsRead && (
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.accent, flexShrink: 0 }} />
                    )}
                    <button
                      aria-label={t('delete') as string}
                      onClick={e => { e.stopPropagation(); dismiss.mutate(n.Id); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '3px', color: '#d1d5db', display: 'flex',
                        borderRadius: '5px', lineHeight: 1, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = '#f3f4f6'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'none'; }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                <p style={{
                  fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 0.3rem',
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } as React.CSSProperties}>
                  {message}
                </p>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 500 }}>
                  {relativeTime(n.DateCreated)}
                </span>
              </div>
            </div>
          );
        })}
      </section>
    );
  };

  if (!customerId) return null;

  const FILTERS: FilterType[] = ['all', 'orders', 'payment', 'alerts'];

  // ── Render ──

  return (
    <div dir={dir}>
      {/* ── Bell trigger ── */}
      <button
        className="cl-icon-btn"
        style={{ width: '2.25rem', height: '2.25rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setIsOpen(true)}
        aria-label={t('notifications') as string}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell style={{ width: '1.25rem', height: '1.25rem' }} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: '-4px',
              [isRtl ? 'left' : 'right']: '-4px',
              minWidth: '18px', height: '18px', padding: '0 4px',
              background: '#ef4444', color: '#fff',
              fontSize: '0.6rem', fontWeight: 800,
              borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 2px #fff',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Slide-in drawer (portal) ── */}
      {createPortal(
        <div dir={dir}>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              opacity: isOpen ? 1 : 0,
              transition: 'opacity 0.25s ease',
              pointerEvents: isOpen ? 'auto' : 'none',
            }}
          />
          {/* Drawer panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('notifications') as string}
            style={{
              position: 'fixed', top: 0, bottom: 0,
              [isRtl ? 'left' : 'right']: 0,
              zIndex: 10001,
              width: 'min(440px, 100vw)',
              background: '#fff',
              display: 'flex', flexDirection: 'column',
              boxShadow: isRtl ? '6px 0 40px rgba(0,0,0,0.10)' : '-6px 0 40px rgba(0,0,0,0.10)',
              transform: isOpen ? 'translateX(0)' : `translateX(${isRtl ? '-100%' : '100%'})`,
              transition: 'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* ── Drawer header ── */}
            <div style={{
              padding: 'calc(1.125rem + env(safe-area-inset-top, 0)) 1.25rem 0.75rem',
              borderBottom: '1px solid #f0f0f0',
              flexShrink: 0,
              background: '#fff',
            }}>
              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => setIsOpen(false)}
                    aria-label={t('close') as string}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '6px', borderRadius: '8px', color: '#6b7280',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#111827'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280'; }}
                  >
                    <X size={18} />
                  </button>
                  <Bell size={18} color="#3b82f6" />
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                    {t('notifications')}
                  </h2>
                  {unreadCount > 0 && (
                    <span style={{
                      background: '#ef4444', color: '#fff',
                      fontSize: '0.65rem', fontWeight: 800,
                      padding: '2px 7px', borderRadius: '10px',
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead.mutate()}
                      disabled={markAllAsRead.isPending}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        color: '#2563eb', fontSize: '0.775rem', fontWeight: 600,
                        padding: '6px 10px', borderRadius: '8px',
                        transition: 'background 0.15s',
                        opacity: markAllAsRead.isPending ? 0.6 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      <CheckCheck size={14} />
                      {t('markAllAsRead')}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => clearAll.mutate()}
                      disabled={clearAll.isPending}
                      aria-label={t('clearAll') as string}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '6px', borderRadius: '8px', color: '#d1d5db',
                        display: 'flex', transition: 'all 0.15s',
                        opacity: clearAll.isPending ? 0.6 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'none'; }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter pills */}
              <div style={{
                display: 'flex', gap: '6px',
                overflowX: 'auto', paddingBottom: '2px',
                msOverflowStyle: 'none',
              } as React.CSSProperties}>
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      background: filter === f ? '#111827' : '#f3f4f6',
                      color: filter === f ? '#fff' : '#6b7280',
                      border: 'none', cursor: 'pointer',
                      padding: '0.35rem 0.875rem', borderRadius: '20px',
                      fontSize: '0.8rem', fontWeight: filter === f ? 700 : 500,
                      whiteSpace: 'nowrap', transition: 'all 0.15s',
                      flexShrink: 0,
                    }}
                  >
                    {t(FILTER_LABELS[f])}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Notification list ── */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                /* Empty state */
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', minHeight: '16rem',
                  padding: '2.5rem 2rem', textAlign: 'center', gap: '0.875rem',
                }}>
                  <div style={{
                    width: '4.5rem', height: '4.5rem', borderRadius: '50%',
                    background: 'linear-gradient(135deg,#fef9f0,#fef3c7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.875rem',
                    boxShadow: '0 4px 16px rgba(251,191,36,0.15)',
                  }}>
                    🔔
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.375rem', fontWeight: 700, color: '#111827', fontSize: '0.9375rem' }}>
                      {t('noNotifications')}
                    </p>
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                      {filter !== 'all' ? t('noNotificationsFiltered') : t('notificationsUpToDate')}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <GroupSection label={t('today') as string} items={grouped.today} />
                  <GroupSection label={t('yesterday') as string} items={grouped.yesterday} />
                  <GroupSection label={t('earlier') as string} items={grouped.earlier} />
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
