import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { NOTIFICATION_TYPE_CONFIG, NotificationPriority } from '../../modules/notifications/notifications.interface';
import type { Notification } from '../../modules/notifications/notifications.model';

interface NotificationItemProps {
    notification: Notification;
    onMarkRead: (id: number) => void;
    onClose?: () => void;
    fullText?: boolean;
}

export function NotificationItem({
    notification,
    onMarkRead,
    onClose,
    fullText = false,
}: NotificationItemProps) {
    const { t, dir } = useLanguage();
    const navigate = useNavigate();
    const isRtl = dir === 'rtl';

    const config = NOTIFICATION_TYPE_CONFIG[notification.type] ?? {
        emoji: 'ℹ️',
        bg: '#f3f4f6',
        color: '#6b7280',
        border: '#9ca3af',
    };

    // Map Tailwind-style class names to actual hex colors for inline styles
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
        'bg-blue-50': { bg: '#eff6ff', text: '#2563eb', border: '#60a5fa' },
        'bg-red-50': { bg: '#fef2f2', text: '#dc2626', border: '#f87171' },
        'bg-red-100': { bg: '#fee2e2', text: '#b91c1c', border: '#ef4444' },
        'bg-green-50': { bg: '#f0fdf4', text: '#16a34a', border: '#4ade80' },
        'bg-orange-50': { bg: '#fff7ed', text: '#ea580c', border: '#fb923c' },
        'bg-purple-50': { bg: '#faf5ff', text: '#9333ea', border: '#a855f7' },
        'bg-gray-100': { bg: '#f3f4f6', text: '#4b5563', border: '#9ca3af' },
        'bg-sky-50': { bg: '#f0f9ff', text: '#0284c7', border: '#38bdf8' },
        'bg-teal-50': { bg: '#f0fdfa', text: '#0d9488', border: '#2dd4bf' },
        'bg-amber-50': { bg: '#fffbeb', text: '#d97706', border: '#fbbf24' },
    };

    const colors = colorMap[config.bgClass] ?? { bg: '#f3f4f6', text: '#6b7280', border: '#9ca3af' };

    const isCriticalOrHigh =
        notification.priority === NotificationPriority.CRITICAL ||
        notification.priority === NotificationPriority.URGENT ||
        notification.priority === NotificationPriority.HIGH;

    // Translated title
    const titleKey = `notification.title.${notification.type}`;
    const translatedTitle = t(titleKey as any) || notification.title;

    // Translated message with interpolation
    const messageKey = `notification.message.${notification.type}`;
    let translatedMessage = t(messageKey as any) || notification.message;
    const replacements: Record<string, string> = {};
    if (notification.data) {
        Object.entries(notification.data).forEach(([k, v]) => {
            if (typeof v === 'string' || typeof v === 'number') {
                replacements[k] = String(v);
            }
        });
    }
    if (notification.orderNumber && !replacements.orderNumber && !replacements.reference)
        replacements.reference = String(notification.orderNumber);
    if (notification.customerName && !replacements.customerName && !replacements.client)
        replacements.client = String(notification.customerName);
    Object.entries(replacements).forEach(([k, v]) => {
        translatedMessage = translatedMessage.replaceAll(`{{${k}}}`, v);
    });
    translatedMessage = translatedMessage.replace(/\{\{\w+\}\}/g, '').replace(/\s{2,}/g, ' ').trim();

    // Relative time
    const formatRelativeTime = (dateString: string) => {
        const now = new Date();
        const created = new Date(dateString);
        const diffMs = now.getTime() - created.getTime();
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMs / 3600000);
        const days = Math.floor(diffMs / 86400000);

        if (minutes < 1) return t('justNow');
        if (minutes < 60) return (t('minutesAgo') as string).replace('{{count}}', String(minutes));
        if (hours < 24) return (t('hoursAgo') as string).replace('{{count}}', String(hours));
        if (days < 7) return (t('daysAgo') as string).replace('{{count}}', String(days));
        return created.toLocaleDateString(isRtl ? 'ar-MA' : 'fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const actionUrl = notification.resolvedActionUrl;

    const handleClick = () => {
        if (!notification.isRead) onMarkRead(notification.id);
        if (actionUrl) {
            navigate(actionUrl);
            onClose?.();
        }
    };


    return (
        <div
            onClick={handleClick}
            className="notification-item"
            dir={dir}
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                background: notification.isRead ? '#fff' : 'rgba(239, 246, 255, 0.3)',
                borderBottom: '1px solid #f9fafb',
                transition: 'background 150ms',
                flexDirection: isRtl ? 'row-reverse' : 'row',
                minHeight: 44,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = notification.isRead ? '#fff' : 'rgba(239, 246, 255, 0.3)')}
        >
            {/* Priority bar */}
            {isCriticalOrHigh && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: colors.border,
                        ...(isRtl ? { right: 0 } : { left: 0 }),
                    }}
                />
            )}

            {/* Icon */}
            <div
                style={{
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: colors.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <span style={{ fontSize: 18 }}>{config.emoji}</span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0, textAlign: isRtl ? 'right' : 'left' }}>
                <div
                    style={{
                        fontSize: '0.875rem',
                        lineHeight: 1.3,
                        fontWeight: notification.isRead ? 400 : 600,
                        color: notification.isRead ? '#6b7280' : '#111827',
                    }}
                >
                    {translatedTitle}
                </div>
                <div
                    style={{
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                        lineHeight: 1.5,
                        marginTop: 2,
                        ...(fullText
                            ? {}
                            : {
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }),
                    }}
                >
                    {translatedMessage}
                </div>

            </div>

            {/* Meta: time + dot */}
            <div
                style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isRtl ? 'flex-start' : 'flex-end',
                    gap: 6,
                    paddingTop: 2,
                }}
            >
                <span style={{ fontSize: '0.6875rem', color: '#d1d5db', whiteSpace: 'nowrap' }}>
                    {formatRelativeTime(notification.dateCreated)}
                </span>
                {!notification.isRead && (
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#2563eb',
                        }}
                    />
                )}
            </div>

        </div>
    );
}
