import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toastInfo } from '../services/toast.service';
import { API_ROUTES } from '../common/api-routes';
import type { TranslationKey } from '../lib/i18n';

// ─── Brand ────────────────────────────────────────────────────────────────────

const PRI = '#df7817';
const PRI_BG = 'rgba(223,120,23,0.08)';

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

type FilterType = 'all' | 'assigned' | 'status' | 'alerts';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { emoji: string; bg: string; accent: string }> = {
  order_assigned: { emoji: '📦', bg: 'rgba(223,120,23,0.08)', accent: PRI },
  new_order_assigned: { emoji: '🚀', bg: 'rgba(223,120,23,0.08)', accent: PRI },
  order_created: { emoji: '📋', bg: '#eff6ff', accent: '#3b82f6' },
  order_status_changed: { emoji: '🔄', bg: '#f0fdf4', accent: '#16a34a' },
  order_picked_up: { emoji: '✅', bg: '#f0fdf4', accent: '#16a34a' },
  order_delivered: { emoji: '🏁', bg: '#f0fdf4', accent: '#16a34a' },
  order_cancelled: { emoji: '⛔', bg: '#fef2f2', accent: '#ef4444' },
  alert: { emoji: '⚠️', bg: '#fffbeb', accent: '#d97706' },
  system: { emoji: '🔔', bg: '#f9fafb', accent: '#6b7280' },
};

const FILTER_TYPES: Record<FilterType, string[]> = {
  all: [],
  assigned: ['order_assigned', 'new_order_assigned', 'order_created'],
  status: ['order_status_changed', 'order_picked_up', 'order_delivered', 'order_cancelled'],
  alerts: ['alert', 'system', 'warning'],
};

const FILTER_LABELS: Record<FilterType, TranslationKey> = {
  all: 'all',
  assigned: 'assigned',
  status: 'status',
  alerts: 'filterAlerts',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(d: Date): boolean {
  const n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
}

function isYesterday(d: Date): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return (
    d.getDate() === y.getDate() &&
    d.getMonth() === y.getMonth() &&
    d.getFullYear() === y.getFullYear()
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const { deliveryPerson } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const prevUnreadRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  // ── Queries ──

  const { data: notifications = [] } = useQuery<ApiNotification[]>({
    queryKey: ['notifications', 'delivery', deliveryPerson?.id],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `${API_ROUTES.NOTIFICATIONS.LIST}?userType=delivery&userId=${deliveryPerson?.id}`,
        { headers },
      );
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!deliveryPerson,
    refetchInterval: 60_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'delivery', deliveryPerson?.id, 'unread-count'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `${API_ROUTES.NOTIFICATIONS.UNREAD_COUNT}?userId=${deliveryPerson?.id}`,
        { headers },
      );
      if (!res.ok) throw new Error('Failed to fetch unread count');
      const json = await res.json();
      return json.data ?? { count: 0 };
    },
    enabled: !!deliveryPerson,
    refetchInterval: 60_000,
  });

  const unreadCount = unreadData?.count ?? 0;

  // ── Toast on new notification (delivery alerts are urgent) ──

  useEffect(() => {
    if (prevUnreadRef.current > 0 && unreadCount > prevUnreadRef.current) {
      toastInfo(t('newNotification') as string, { duration: 5000 });
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // ── Keyboard + scroll lock ──

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── Mutations ──

  const markAsRead = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(API_ROUTES.NOTIFICATIONS.MARK_READ(id), {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(
        `${API_ROUTES.NOTIFICATIONS.MARK_ALL_READ}?userId=${deliveryPerson?.id}`,
        {
          method: 'PATCH',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) throw new Error('Failed to mark all as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const dismiss = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(API_ROUTES.NOTIFICATIONS.ARCHIVE(id), {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to dismiss');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(API_ROUTES.NOTIFICATIONS.ARCHIVE_ALL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userType: 'delivery', userId: deliveryPerson?.id }),
      });
      if (!res.ok) throw new Error('Failed to clear all');
      return res.json();
    },
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [notifications]);

  const typeConf = (type: string) =>
    TYPE_CONFIG[type] ?? { emoji: '📬', bg: '#f9fafb', accent: '#6b7280' };

  const relativeTime = (ds: string): string => {
    const ms = now - new Date(ds).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (mins < 1) return t('justNow') as string;
    if (mins < 60) return `${mins} ${t('minutesAgo')}`;
    if (hrs < 24) return `${hrs} ${t('hoursAgo')}`;
    if (days < 7) return `${days} ${t('daysAgo')}`;
    return new Date(ds).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const translateNotif = (n: ApiNotification) => {
    const titleMap: Record<string, TranslationKey> = {
      'New Order': 'notifications.newOrder',
      'Order Assigned': 'notifications.orderAssigned',
      'Order Status Changed': 'notifications.statusChanged',
      'Order Status Updated': 'notifications.statusChanged',
      'Order Cancelled': 'notifications.orderCancelled',
      'Order Created': 'notifications.newOrder',
      'Delivery Assigned': 'notifications.orderAssigned',
      'New Order Assigned': 'notifications.orderAssigned',
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
      const status = (t(statusKey as any) || statusKey) as string;
      message =
        language === 'ar'
          ? `${status} - #${orderNumber} ${t('order')}`
          : `${t('order')} ${orderNumber} - ${status}`;
    } else {
      message =
        language === 'ar' ? `#${orderNumber} ${t('order')}` : `${t('order')} #${orderNumber}`;
    }
    return { title, message };
  };

  // ── Sub-component: Group section ──

  const GroupSection = ({ label, items }: { label: string; items: ApiNotification[] }) => {
    if (!items.length) return null;
    return (
      <section>
        <div
          style={{
            padding: '1rem 1.25rem 0.5rem',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </div>
        {items.map((n) => {
          const cfg = typeConf(n.Type);
          const { title, message } = translateNotif(n);
          const isUrgent =
            !n.IsRead && (n.Type === 'order_assigned' || n.Type === 'new_order_assigned');
          return (
            <div
              key={n.Id}
              role="button"
              tabIndex={0}
              aria-label={title}
              onClick={() => {
                if (!n.IsRead) markAsRead.mutate(n.Id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !n.IsRead) markAsRead.mutate(n.Id);
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                padding: '1rem 1.25rem',
                cursor: n.IsRead ? 'default' : 'pointer',
                background: isUrgent ? PRI_BG : n.IsRead ? 'transparent' : 'rgba(0,0,0,0.02)',
                borderBottom: '1px solid #f3f4f6',
                transition: 'background 0.15s',
                position: 'relative',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Unread accent bar */}
              {!n.IsRead && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '12px',
                    bottom: '12px',
                    width: '4px',
                    background: cfg.accent,
                    borderRadius: '0 4px 4px 0',
                  }}
                />
              )}
              {/* Icon */}
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '16px',
                  background: cfg.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.375rem',
                  flexShrink: 0,
                  boxShadow: isUrgent ? `0 0 0 2px ${cfg.accent}30` : 'none',
                }}
              >
                {cfg.emoji}
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    marginBottom: '0.3rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '1rem',
                      lineHeight: 1.3,
                      fontWeight: n.IsRead ? 600 : 800,
                      color: n.IsRead ? '#374151' : '#111827',
                    }}
                  >
                    {title}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {!n.IsRead && (
                      <span
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: cfg.accent,
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${cfg.accent}80`,
                        }}
                      />
                    )}
                    <button
                      aria-label={t('delete') as string}
                      onClick={(e) => {
                        e.stopPropagation();
                        dismiss.mutate(n.Id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#d1d5db',
                        display: 'flex',
                        borderRadius: '6px',
                        lineHeight: 1,
                        transition: 'all 0.15s',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <p
                  style={
                    {
                      fontSize: '0.9rem',
                      color: '#6b7280',
                      margin: '0 0 0.4rem',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    } as React.CSSProperties
                  }
                >
                  {message}
                </p>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>
                  {relativeTime(n.DateCreated)}
                </span>
              </div>
            </div>
          );
        })}
      </section>
    );
  };

  const FILTERS: FilterType[] = ['all', 'assigned', 'status', 'alerts'];

  // ── Render ──

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Bell trigger ── */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label={t('notifications') as string}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.12)',
          border: 'none',
          cursor: 'pointer',
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          transition: 'background 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.22)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
        }}
      >
        <Bell size={20} strokeWidth={2} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.625rem',
              fontWeight: 800,
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
              animation: unreadCount > prevUnreadRef.current ? 'none' : undefined,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Bottom-sheet drawer (portal) ── */}
      {createPortal(
        <div>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              background: 'rgba(0,0,0,0.5)',
              opacity: isOpen ? 1 : 0,
              transition: 'opacity 0.25s ease',
              pointerEvents: isOpen ? 'auto' : 'none',
            }}
          />
          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('notifications') as string}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 10001,
              height: '88dvh',
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '10px 0 4px',
                flexShrink: 0,
              }}
            >
              <div
                style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#e5e7eb' }}
              />
            </div>

            {/* ── Sheet header ── */}
            <div
              style={{
                padding: '0.5rem 1.25rem 0.75rem',
                borderBottom: '1px solid #f0f0f0',
                flexShrink: 0,
              }}
            >
              {/* Title row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.875rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <h2
                    style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#111827' }}
                  >
                    {t('notifications')}
                  </h2>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
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
                        background: PRI_BG,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: PRI,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '7px 12px',
                        borderRadius: '10px',
                        opacity: markAllAsRead.isPending ? 0.6 : 1,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <CheckCheck size={15} />
                      {t('markAllRead')}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => clearAll.mutate()}
                      disabled={clearAll.isPending}
                      aria-label={t('clearAll') as string}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '7px',
                        borderRadius: '10px',
                        color: '#d1d5db',
                        display: 'flex',
                        opacity: clearAll.isPending ? 0.6 : 1,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    aria-label={t('close') as string}
                    style={{
                      background: '#f3f4f6',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '7px',
                      borderRadius: '10px',
                      color: '#6b7280',
                      display: 'flex',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Filter pills */}
              <div
                style={
                  {
                    display: 'flex',
                    gap: '7px',
                    overflowX: 'auto',
                    paddingBottom: '2px',
                    msOverflowStyle: 'none',
                  } as React.CSSProperties
                }
              >
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      background: filter === f ? '#111827' : '#f3f4f6',
                      color: filter === f ? '#fff' : '#6b7280',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.45rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.875rem',
                      fontWeight: filter === f ? 700 : 600,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                      flexShrink: 0,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {t(FILTER_LABELS[f])}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Notification list ── */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingBottom: 'env(safe-area-inset-bottom, 16px)',
              }}
              className="orderium-scrollbar"
            >
              {filtered.length === 0 ? (
                /* Empty state */
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '14rem',
                    padding: '2.5rem 2rem',
                    textAlign: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '5rem',
                      height: '5rem',
                      borderRadius: '50%',
                      background: PRI_BG,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.25rem',
                    }}
                  >
                    🔔
                  </div>
                  <div>
                    <p
                      style={{
                        margin: '0 0 0.5rem',
                        fontWeight: 800,
                        color: '#111827',
                        fontSize: '1.0625rem',
                      }}
                    >
                      {t('noNotifications')}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: '#6b7280',
                        fontSize: '0.9375rem',
                        lineHeight: 1.5,
                      }}
                    >
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
