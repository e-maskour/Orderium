import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../hooks/useNotifications';
import {
    NOTIFICATION_TAB_TYPES,
    type NotificationTab,
} from '../../modules/notifications/notifications.interface';
import type { Notification } from '../../modules/notifications/notifications.model';
import { NotificationItem } from './NotificationItem';

const TABS: NotificationTab[] = ['all', 'unread', 'orders', 'stock', 'payments', 'team'];

const TAB_I18N: Record<NotificationTab, string> = {
    all: 'tabAll',
    unread: 'tabUnread',
    orders: 'tabOrders',
    stock: 'tabStock',
    payments: 'tabPayments',
    team: 'tabTeam',
};

export function NotificationBell() {
    const { t, dir } = useLanguage();
    const navigate = useNavigate();
    const isRtl = dir === 'rtl';
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<NotificationTab>('all');
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches
    );
    // For desktop positioning: track bell button rect
    const [bellRect, setBellRect] = useState<DOMRect | null>(null);
    const bellRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 480px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Update bell position when opening
    useEffect(() => {
        if (isOpen && bellRef.current) {
            setBellRect(bellRef.current.getBoundingClientRect());
        }
    }, [isOpen]);

    const {
        notifications,
        unreadCount,
        hasCriticalUnread,
        markAsRead,
        markAllRead,
    } = useNotifications();

    // Filter notifications by active tab
    const filteredNotifications = useMemo(() => {
        let filtered = notifications;
        if (activeTab === 'unread') {
            filtered = filtered.filter((n) => !n.isRead);
        } else if (activeTab !== 'all') {
            const types = NOTIFICATION_TAB_TYPES[activeTab];
            if (types) filtered = filtered.filter((n) => types.includes(n.type as any));
        }
        return filtered.slice(0, 8);
    }, [notifications, activeTab]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                bellRef.current && !bellRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen]);

    const closePanel = useCallback(() => setIsOpen(false), []);

    const unreadTabCount = useMemo(
        () => notifications.filter((n) => !n.isRead).length,
        [notifications]
    );

    // Compute desktop panel position from bell rect
    const desktopPanelStyle: React.CSSProperties = bellRect ? {
        position: 'fixed',
        top: bellRect.bottom + 8,
        ...(isRtl ? { left: bellRect.left } : { right: window.innerWidth - bellRect.right }),
        width: 380,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 480,
        overflowY: 'auto',
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        zIndex: 9999,
    } : { display: 'none' };

    const mobilePanelStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '85vh',
        overflowY: 'auto',
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        border: '1px solid #e5e7eb',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        zIndex: 9999,
    };

    const panelContent = (
        <>
            {/* Backdrop (mobile only) */}
            <div
                onClick={() => setIsOpen(false)}
                style={{
                    display: isMobile ? 'block' : 'none',
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.3)',
                    zIndex: 9998,
                }}
            />

            {/* Panel */}
            <div ref={panelRef} dir={dir} style={isMobile ? mobilePanelStyle : desktopPanelStyle}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{t('notifications')}</span>
                        {unreadCount > 0 && (
                            <span style={{ background: '#2563eb', color: '#fff', fontSize: '0.625rem', fontWeight: 600, borderRadius: 9999, padding: '2px 6px', minWidth: 20, textAlign: 'center' }}>
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllRead()}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 500, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8, minHeight: 32, flexDirection: isRtl ? 'row-reverse' : 'row' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <CheckCheck style={{ width: 14, height: 14 }} />
                            {t('markAllRead')}
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', gap: 4, padding: '8px 12px', overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' } as React.CSSProperties}>
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 500, border: 'none', cursor: 'pointer', background: isActive ? '#2563eb' : 'transparent', color: isActive ? '#fff' : '#6b7280', transition: 'all 150ms', minHeight: 32, display: 'flex', alignItems: 'center', gap: 4 }}
                                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f3f4f6'; }}
                                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {t(TAB_I18N[tab] as any)}
                                    {tab === 'unread' && unreadTabCount > 0 && !isActive && (
                                        <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.5625rem', fontWeight: 700, borderRadius: 9999, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {unreadTabCount > 9 ? '9+' : unreadTabCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Notification List */}
                <div>
                    {filteredNotifications.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <span style={{ fontSize: '2rem' }}>🔔</span>
                            </div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>{t('emptyTitle')}</span>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>{t('emptySubtitle')}</span>
                        </div>
                    ) : (
                        filteredNotifications.map((notification: Notification) => (
                            <NotificationItem key={notification.id} notification={notification} onMarkRead={markAsRead} onClose={closePanel} />
                        ))
                    )}
                </div>

                {/* Footer */}
                {filteredNotifications.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => { navigate('/notifications'); setIsOpen(false); }}
                            style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, minHeight: 36 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            {t('viewAllNotifications')} →
                        </button>
                    </div>
                )}
            </div>
        </>
    );

    return (
        <div style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                ref={bellRef}
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={t('notifications')}
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    background: isOpen ? '#eff6ff' : 'transparent',
                    transition: 'background 150ms',
                    animation: hasCriticalUnread ? 'wiggle 0.6s ease-in-out' : undefined,
                }}
                onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = '#f3f4f6'; }}
                onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
            >
                <Bell style={{ width: 20, height: 20, color: '#374151' }} />

                {unreadCount > 0 && (
                    <span
                        style={{
                            position: 'absolute',
                            top: -2,
                            ...(isRtl ? { left: -2 } : { right: -2 }),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 20,
                            height: 20,
                            padding: '0 4px',
                            borderRadius: 9999,
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            color: '#fff',
                            background: hasCriticalUnread ? '#ef4444' : '#2563eb',
                            boxShadow: '0 0 0 2px #fff',
                            animation: hasCriticalUnread ? 'pulse 2s ease-in-out infinite' : undefined,
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Portal: renders outside all parent stacking contexts */}
            {isOpen && createPortal(panelContent, document.body)}

            {/* Keyframe animations */}
            <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(12deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(6deg); }
          60% { transform: rotate(-4deg); }
          75% { transform: rotate(2deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
        </div>
    );
}
