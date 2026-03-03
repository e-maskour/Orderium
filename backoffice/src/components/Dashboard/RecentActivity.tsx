import { Clock, TrendingUp, Package, Users } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../lib/formatters';
import type { IRecentActivity as Activity } from '../../modules/statistics/statistics.interface';

interface RecentActivityProps {
    activities?: Activity[];
}

const iconConfig: Record<string, { bg: string; color: string; shadow: string }> = {
    order: { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', shadow: 'rgba(59,130,246,0.2)' },
    customer: { bg: 'linear-gradient(135deg, #a855f7, #9333ea)', color: '#fff', shadow: 'rgba(168,85,247,0.2)' },
    product: { bg: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', shadow: 'rgba(249,115,22,0.2)' },
    revenue: { bg: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', shadow: 'rgba(34,197,94,0.2)' },
    default: { bg: 'linear-gradient(135deg, #64748b, #475569)', color: '#fff', shadow: 'rgba(100,116,139,0.2)' },
};

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
    const { t, language } = useLanguage();

    const formatRelativeTime = (timestamp: string): string => {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return `${diffInSeconds} ${t('secondsAgo') || 'seconds ago'}`;
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} ${t('minutesAgo') || 'min ago'}`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} ${t('hoursAgo') || 'hours ago'}`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} ${t('daysAgo') || 'days ago'}`;
        }
    };

    if (!activities || activities.length === 0) {
        return (
            <div style={{ padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                        {t('recentActivity')}
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.25rem' }}>{t('latestUpdates')}</p>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <div style={{
                        width: '3.5rem',
                        height: '3.5rem',
                        borderRadius: '1rem',
                        background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.75rem',
                    }}>
                        <Clock style={{ width: '1.5rem', height: '1.5rem', color: '#9ca3af' }} />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
                        {t('noRecentActivity') || 'No recent activity'}
                    </p>
                </div>
            </div>
        );
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'order': return Package;
            case 'customer': return Users;
            case 'product': return Package;
            case 'revenue': return TrendingUp;
            default: return Clock;
        }
    };

    return (
        <div style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                        {t('recentActivity')}
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.25rem' }}>{t('latestUpdates')}</p>
                </div>
                <div style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: '#f59e0b',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '2rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                }}>
                    Live
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
                {activities.map((activity, index) => {
                    const Icon = getIcon(activity.type);
                    const config = iconConfig[activity.type] || iconConfig.default;

                    return (
                        <div
                            key={index}
                            className="activity-item-enterprise"
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                padding: '0.875rem',
                                borderRadius: '0.75rem',
                                background: '#f9fafb',
                                border: '1px solid #f3f4f6',
                                transition: 'all 0.15s ease',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{
                                width: '2.25rem',
                                height: '2.25rem',
                                borderRadius: '0.625rem',
                                background: config.bg,
                                boxShadow: `0 3px 8px ${config.shadow}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Icon style={{ width: '1rem', height: '1rem', color: '#fff' }} strokeWidth={2} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                                            {activity.title}
                                        </p>
                                        <p style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            marginTop: '0.125rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {activity.description}
                                        </p>
                                    </div>
                                    {activity.value !== undefined && (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: '#111827',
                                            whiteSpace: 'nowrap',
                                            backgroundColor: '#f0fdf4',
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '1rem',
                                        }}>
                                            {formatCurrency(activity.value, language)}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem' }}>
                                    <Clock style={{ width: '0.6875rem', height: '0.6875rem', color: '#9ca3af' }} />
                                    <span style={{ fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 500 }}>
                                        {formatRelativeTime(activity.timestamp)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
        .activity-item-enterprise:hover {
          background: #f3f4f6 !important;
          border-color: #e5e7eb !important;
        }
      `}</style>
        </div>
    );
};
