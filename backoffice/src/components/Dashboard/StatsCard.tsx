import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'amber' | 'blue' | 'green' | 'purple' | 'red' | 'emerald' | 'orange' | 'indigo';
    subtitle?: string;
}

const colorConfig: Record<string, { iconBg: string; accent: string }> = {
    amber: { iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)', accent: '#d97706' },
    blue: { iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)', accent: '#2563eb' },
    green: { iconBg: 'linear-gradient(135deg, #22c55e, #16a34a)', accent: '#16a34a' },
    purple: { iconBg: 'linear-gradient(135deg, #a855f7, #9333ea)', accent: '#9333ea' },
    red: { iconBg: 'linear-gradient(135deg, #ef4444, #dc2626)', accent: '#dc2626' },
    emerald: { iconBg: 'linear-gradient(135deg, #10b981, #059669)', accent: '#059669' },
    orange: { iconBg: 'linear-gradient(135deg, #f97316, #ea580c)', accent: '#ea580c' },
    indigo: { iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)', accent: '#4f46e5' },
};

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    color = 'blue',
    subtitle,
}) => {
    const colors = colorConfig[color] || colorConfig.blue;

    return (
        <div
            className="stats-card-enterprise"
            style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e5e7eb',
                padding: '1.25rem',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
            }}
        >
            {/* Accent top bar */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: colors.iconBg,
                borderRadius: '0.875rem 0.875rem 0 0',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                    }}>
                        {title}
                    </p>
                    <p style={{
                        fontSize: '1.625rem',
                        fontWeight: 800,
                        color: '#111827',
                        margin: 0,
                        lineHeight: 1.2,
                        letterSpacing: '-0.01em',
                    }}>
                        {value}
                    </p>
                    {subtitle && (
                        <p style={{ fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 500, marginTop: '0.25rem' }}>{subtitle}</p>
                    )}
                    {trend && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.625rem' }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '0.1875rem 0.5rem',
                                borderRadius: '2rem',
                                backgroundColor: trend.isPositive ? '#f0fdf4' : '#fef2f2',
                                color: trend.isPositive ? '#16a34a' : '#dc2626',
                            }}>
                                {trend.isPositive
                                    ? <TrendingUp style={{ width: '0.6875rem', height: '0.6875rem' }} strokeWidth={2.5} />
                                    : <TrendingDown style={{ width: '0.6875rem', height: '0.6875rem' }} strokeWidth={2.5} />
                                }
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </div>
                            <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>vs last period</span>
                        </div>
                    )}
                </div>

                <div
                    style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        background: colors.iconBg,
                        borderRadius: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: `0 4px 12px ${colors.accent}30`,
                    }}
                >
                    <Icon style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} strokeWidth={2} />
                </div>
            </div>

            <style>{`
        .stats-card-enterprise:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }
      `}</style>
        </div>
    );
};
