import { useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, BarChart3, X } from 'lucide-react';

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
                <div
                    className="kpi-icon-bubble"
                    style={{
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

// ---------- KpiSheet ----------
// Desktop: renders KpiGrid normally.
// Mobile (≤639px): hides grid, shows a single button that opens a bottom-sheet drawer.
export const KpiSheet: React.FC<{ count: number; children: React.ReactNode; label?: string }> = ({
    count,
    children,
    label = 'Statistiques',
}) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <style>{`
                .kpi-sheet-desktop { display: block; }
                .kpi-sheet-mobile-btn { display: none !important; }
                @media (max-width: 639px) {
                    .kpi-sheet-desktop { display: none !important; }
                    .kpi-sheet-mobile-btn { display: flex !important; }
                }
                .kpi-sheet-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15,23,42,0.45);
                    z-index: 1000;
                    display: flex;
                    align-items: flex-end;
                    animation: kpi-overlay-in 0.2s ease;
                }
                .kpi-sheet-panel {
                    width: 100%;
                    background: #ffffff;
                    border-radius: 1.25rem 1.25rem 0 0;
                    padding: 0 1rem 2.5rem;
                    max-height: 80vh;
                    overflow-y: auto;
                    animation: kpi-panel-up 0.28s cubic-bezier(0.32,0.72,0,1);
                }
                .kpi-sheet-handle {
                    width: 2.5rem;
                    height: 4px;
                    background: #e2e8f0;
                    border-radius: 2px;
                    margin: 0.75rem auto 1.25rem;
                }
                .kpi-sheet-inner-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                }
                /* Compact card overrides inside sheet */
                .kpi-sheet-inner-grid .kpi-card-enterprise {
                    padding: 0.625rem 0.625rem 0.625rem 0.875rem;
                }
                .kpi-sheet-inner-grid .kpi-icon-bubble {
                    width: 2rem !important;
                    height: 2rem !important;
                    border-radius: 0.5rem !important;
                }
                .kpi-sheet-inner-grid .kpi-icon-bubble svg {
                    width: 0.875rem !important;
                    height: 0.875rem !important;
                }
                .kpi-sheet-inner-grid .kpi-card-enterprise > div {
                    gap: 0.5rem !important;
                }
                .kpi-sheet-inner-grid .kpi-card-enterprise p {
                    font-size: 0.5625rem !important;
                    white-space: normal !important;
                    overflow: hidden !important;
                    text-overflow: unset !important;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    line-height: 1.3;
                    letter-spacing: 0.04em !important;
                }
                .kpi-sheet-inner-grid .kpi-card-enterprise h3 {
                    font-size: 0.8125rem !important;
                    white-space: normal !important;
                    word-break: break-word;
                    line-height: 1.2 !important;
                    letter-spacing: -0.01em !important;
                }
                @keyframes kpi-overlay-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes kpi-panel-up {
                    from { transform: translateY(100%); }
                    to   { transform: translateY(0); }
                }
            `}</style>

            {/* Desktop: normal grid */}
            <div className="kpi-sheet-desktop">
                <KpiGrid count={count}>{children}</KpiGrid>
            </div>

            {/* Mobile: trigger button */}
            <button
                type="button"
                className="kpi-sheet-mobile-btn"
                onClick={() => setOpen(true)}
                style={{
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#235ae4',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                }}
            >
                <BarChart3 style={{ width: '1rem', height: '1rem' }} />
                {label}
            </button>

            {/* Bottom sheet */}
            {open && (
                <div className="kpi-sheet-overlay" onClick={() => setOpen(false)}>
                    <div className="kpi-sheet-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="kpi-sheet-handle" />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>{label}</span>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                <X style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                            </button>
                        </div>
                        <div className="kpi-sheet-inner-grid">{children}</div>
                    </div>
                </div>
            )}
        </>
    );
};
