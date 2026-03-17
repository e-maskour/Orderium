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

const colorConfig: Record<string, { iconBg: string; iconShadow: string }> = {
    blue: { iconBg: 'linear-gradient(135deg, #235ae4, #1a47b8)', iconShadow: 'rgba(35,90,228,0.28)' },
    amber: { iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)', iconShadow: 'rgba(217,119,6,0.26)' },
    green: { iconBg: 'linear-gradient(135deg, #22c55e, #16a34a)', iconShadow: 'rgba(22,163,74,0.26)' },
    purple: { iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', iconShadow: 'rgba(124,58,237,0.26)' },
    red: { iconBg: 'linear-gradient(135deg, #f43f5e, #e11d48)', iconShadow: 'rgba(225,29,72,0.26)' },
    emerald: { iconBg: 'linear-gradient(135deg, #10b981, #059669)', iconShadow: 'rgba(5,150,105,0.26)' },
    orange: { iconBg: 'linear-gradient(135deg, #fb923c, #ea580c)', iconShadow: 'rgba(234,88,12,0.26)' },
    indigo: { iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)', iconShadow: 'rgba(79,70,229,0.26)' },
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
                border: '1px solid #e8ecf2',
                padding: '1.375rem 1.375rem 1.25rem',
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
                boxShadow: `0 2px 8px ${colors.iconShadow}`,
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: '#64748b',
                        margin: '0 0 0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}>
                        {title}
                    </p>
                    <p style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        margin: '0 0 0.1875rem',
                        lineHeight: 1.1,
                        letterSpacing: '-0.025em',
                    }}>
                        {value}
                    </p>
                    {subtitle && (
                        <p style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500, margin: 0 }}>{subtitle}</p>
                    )}
                    {trend && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.625rem' }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '0.1875rem 0.5rem',
                                borderRadius: '2rem',
                                background: trend.isPositive ? '#f0fdf4' : '#fff1f2',
                                color: trend.isPositive ? '#16a34a' : '#e11d48',
                            }}>
                                {trend.isPositive
                                    ? <TrendingUp style={{ width: '0.625rem', height: '0.625rem' }} strokeWidth={3} />
                                    : <TrendingDown style={{ width: '0.625rem', height: '0.625rem' }} strokeWidth={3} />
                                }
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>vs last period</span>
                        </div>
                    )}
                </div>

                <div style={{
                    width: '3rem',
                    height: '3rem',
                    background: colors.iconBg,
                    borderRadius: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 4px 14px ${colors.iconShadow}`,
                }}>
                    <Icon style={{ width: '1.375rem', height: '1.375rem', color: '#fff' }} strokeWidth={2} />
                </div>
            </div>

            <style>{`
                .stats-card-enterprise:hover {
                    box-shadow: 0 8px 24px rgba(15,23,42,0.09) !important;
                    transform: translateY(-2px);
                    border-color: #d1d9e6 !important;
                }
            `}</style>
        </div>
    );
};
