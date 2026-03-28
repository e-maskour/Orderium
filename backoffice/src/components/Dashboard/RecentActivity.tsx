import { Clock, TrendingUp, Package, Users, ShoppingBag, Bell } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../lib/formatters';
import type { IRecentActivity as Activity } from '../../modules/statistics/statistics.interface';

interface RecentActivityProps {
    activities?: Activity[];
}

const iconConfig: Record<string, { bg: string; color: string; shadow: string }> = {
    order: { bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', shadow: 'rgba(59,130,246,0.22)' },
    customer: { bg: 'linear-gradient(135deg,#a855f7,#9333ea)', color: '#fff', shadow: 'rgba(168,85,247,0.22)' },
    product: { bg: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', shadow: 'rgba(14,165,233,0.22)' },
    revenue: { bg: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', shadow: 'rgba(34,197,94,0.22)' },
    default: { bg: 'linear-gradient(135deg,#64748b,#475569)', color: '#fff', shadow: 'rgba(100,116,139,0.22)' },
};

const typeBadgeStyles: Record<string, { bg: string; color: string; border: string }> = {
    order: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    customer: { bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff' },
    product: { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' },
    revenue: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
};

function getIcon(type: string) {
    switch (type) {
        case 'order': return ShoppingBag;
        case 'customer': return Users;
        case 'product': return Package;
        case 'revenue': return TrendingUp;
        default: return Bell;
    }
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
    const { t, language } = useLanguage();

    const typeBadgeConfig: Record<string, { bg: string; color: string; border: string; label: string }> = {
        order: { ...typeBadgeStyles.order, label: t('order') },
        customer: { ...typeBadgeStyles.customer, label: t('customer') },
        product: { ...typeBadgeStyles.product, label: t('product') },
        revenue: { ...typeBadgeStyles.revenue, label: t('revenue') },
    };

    const formatRelativeTime = (timestamp: string): string => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - new Date(timestamp).getTime()) / 1000);
        if (diff < 60) return `${diff} ${t('secondsAgo') || 's ago'}`;
        if (diff < 3600) return `${Math.floor(diff / 60)} ${t('minutesAgo') || 'min ago'}`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('hoursAgo') || 'h ago'}`;
        return `${Math.floor(diff / 86400)} ${t('daysAgo') || 'd ago'}`;
    };

    const header = (
        <div className="db-chart-header">
            <div className="db-chart-header-left">
                <div className="db-chart-icon" style={{
                    background: 'linear-gradient(135deg,#235ae4,#1a47b8)',
                    boxShadow: '0 4px 10px rgba(35,90,228,0.28)',
                }}>
                    <Bell style={{ width: '1.125rem', height: '1.125rem', color: '#fff' }} strokeWidth={2} />
                </div>
                <div>
                    <h3 className="db-chart-title">{t('recentActivity')}</h3>
                    <p className="db-chart-subtitle">{t('latestUpdates')}</p>
                </div>
            </div>
            <span className="db-chart-badge" style={{
                background: '#f0fdf4', color: '#16a34a',
                border: '1px solid #bbf7d0',
            }}>
                <span className="db-live-dot" />Live
            </span>
        </div>
    );

    if (!activities || activities.length === 0) {
        return (
            <div className="db-chart-card">
                {header}
                <div className="db-empty-state">
                    <div className="db-empty-state__icon">
                        <Clock style={{ width: '1.5rem', height: '1.5rem', color: '#9ca3af' }} />
                    </div>
                    <p className="db-empty-state__text">
                        {t('noRecentActivity') || 'No recent activity'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="db-chart-card">
            {header}
            <div className="db-activity-timeline" style={{ paddingTop: '0.25rem' }}>
                {activities.map((activity, index) => {
                    const Icon = getIcon(activity.type);
                    const cfg = iconConfig[activity.type] || iconConfig.default;
                    const badge = typeBadgeConfig[activity.type];

                    return (
                        <div key={index} className="db-activity-item">
                            {/* Icon */}
                            <div style={{
                                width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem',
                                background: cfg.bg, boxShadow: `0 3px 8px ${cfg.shadow}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Icon style={{ width: '1rem', height: '1rem', color: '#fff' }} strokeWidth={2} />
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {/* Type badge + title row */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1875rem', flexWrap: 'wrap' }}>
                                            {badge && (
                                                <span style={{
                                                    fontSize: '0.625rem', fontWeight: 700,
                                                    padding: '0.125rem 0.4375rem',
                                                    borderRadius: '9999px',
                                                    background: badge.bg, color: badge.color,
                                                    border: `1px solid ${badge.border}`,
                                                    textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    flexShrink: 0,
                                                }}>
                                                    {badge.label}
                                                </span>
                                            )}
                                            <p style={{
                                                fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b',
                                                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {activity.title}
                                            </p>
                                        </div>
                                        <p style={{
                                            fontSize: '0.75rem', color: '#64748b', margin: 0,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {activity.description}
                                        </p>
                                    </div>

                                    {/* Value + time */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        {activity.value !== undefined && (
                                            <p style={{
                                                fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a',
                                                margin: '0 0 0.125rem', fontVariantNumeric: 'tabular-nums',
                                            }}>
                                                {formatCurrency(activity.value, language)}
                                            </p>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                            <Clock style={{ width: '0.625rem', height: '0.625rem', color: '#cbd5e1' }} />
                                            <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>
                                                {formatRelativeTime(activity.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
