import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export type KpiColor = 'blue' | 'emerald' | 'amber' | 'purple' | 'red' | 'green' | 'orange' | 'indigo';

// ---------- KpiGrid ----------
// count=3 or 4 → fills the row (3 or 4 equal cols)
// count=5      → 3 cols / 2 rows
// count>5      → 3 cols
// Responsive: ≤1023px → 2 cols, ≤639px → 1 col
export const KpiGrid: React.FC<{ count: number; children: React.ReactNode }> = ({ count, children }) => {
    const cols = count <= 4 ? count : 3;
    return (
        <>
            <style>{`
                .kpi-grid-cols-${cols} {
                    display: grid;
                    grid-template-columns: repeat(${cols}, 1fr);
                    gap: 0.875rem;
                }
                @media (max-width: 1023px) {
                    .kpi-grid-cols-${cols} { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 639px) {
                    .kpi-grid-cols-${cols} { grid-template-columns: 1fr; }
                }
            `}</style>
            <div className={`kpi-grid-cols-${cols}`}>{children}</div>
        </>
    );
};

interface KpiCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color?: KpiColor;
    loading?: boolean;
    subtitle?: string;
    /** Optional trend badge — e.g. { value: 12, isPositive: true } → "+12%" */
    trend?: { value: number; isPositive: boolean };
}

const colorConfig: Record<KpiColor, {
    gradient: string;
    accentColor: string;
    iconShadow: string;
}> = {
    blue: { gradient: 'linear-gradient(135deg, #235ae4, #1a47b8)', accentColor: '#235ae4', iconShadow: 'rgba(35,90,228,0.26)' },
    emerald: { gradient: 'linear-gradient(135deg, #10b981, #059669)', accentColor: '#059669', iconShadow: 'rgba(5,150,105,0.24)' },
    amber: { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', accentColor: '#d97706', iconShadow: 'rgba(217,119,6,0.24)' },
    purple: { gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', accentColor: '#7c3aed', iconShadow: 'rgba(124,58,237,0.24)' },
    red: { gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)', accentColor: '#e11d48', iconShadow: 'rgba(225,29,72,0.24)' },
    green: { gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', accentColor: '#16a34a', iconShadow: 'rgba(22,163,74,0.24)' },
    orange: { gradient: 'linear-gradient(135deg, #fb923c, #ea580c)', accentColor: '#ea580c', iconShadow: 'rgba(234,88,12,0.24)' },
    indigo: { gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', accentColor: '#4f46e5', iconShadow: 'rgba(79,70,229,0.24)' },
};

export const KpiCard: React.FC<KpiCardProps> = ({
    label,
    value,
    icon: Icon,
    color = 'blue',
    loading = false,
    subtitle,
    trend,
}) => {
    const c = colorConfig[color];
    const valStr = String(value);
    const valueFontSize = loading
        ? '1.375rem'
        : valStr.length > 12 ? '1.0625rem'
            : valStr.length > 8 ? '1.25rem'
                : '1.5rem';

    return (
        <div
            className="kpi-card-enterprise"
            style={{
                position: 'relative',
                background: '#ffffff',
                borderRadius: '0.875rem',
                padding: '1rem 1rem 1rem 1.25rem',
                border: '1px solid #e8ecf2',
                boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                overflow: 'hidden',
            }}
        >
            {/* Left accent bar */}
            <div style={{
                position: 'absolute',
                left: 0,
                top: '14%',
                bottom: '14%',
                width: '4px',
                borderRadius: '0 3px 3px 0',
                background: c.gradient,
                boxShadow: `2px 0 8px ${c.iconShadow}`,
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                {/* Icon bubble */}
                <div style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    background: c.gradient,
                    boxShadow: `0 4px 14px ${c.iconShadow}`,
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Icon style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} strokeWidth={2} />
                </div>

                {/* Content */}
                <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{
                        fontSize: '0.6875rem',
                        color: '#64748b',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        margin: '0 0 0.25rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {label}
                    </p>
                    <h3 style={{
                        fontSize: valueFontSize,
                        fontWeight: 800,
                        color: '#0f172a',
                        margin: 0,
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {loading
                            ? <span style={{
                                display: 'inline-block',
                                width: '65%',
                                height: '1.25rem',
                                borderRadius: '0.375rem',
                                background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                                backgroundSize: '200% 100%',
                                animation: 'kpi-shimmer 1.4s infinite linear',
                                verticalAlign: 'middle',
                            }} />
                            : value}
                    </h3>

                    {(subtitle || trend) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', marginTop: '0.3125rem', flexWrap: 'wrap' }}>
                            {trend && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.1875rem',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    padding: '0.125rem 0.4375rem',
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
                            )}
                            {subtitle && (
                                <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0, fontWeight: 500 }}>{subtitle}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes kpi-shimmer {
                    0%   { background-position: -200% 0; }
                    100% { background-position:  200% 0; }
                }
                .kpi-card-enterprise:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(15,23,42,0.09) !important;
                    border-color: #d1d9e6 !important;
                }
            `}</style>
        </div>
    );
};
