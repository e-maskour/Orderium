import { LucideIcon } from 'lucide-react';

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
                    gap: 0.75rem;
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
}

const colorConfig: Record<KpiColor, { gradient: string; border: string; shadow: string }> = {
    blue: { gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#bfdbfe', shadow: '0 4px 12px rgba(59,130,246,0.22)' },
    emerald: { gradient: 'linear-gradient(135deg, #10b981, #059669)', border: '#a7f3d0', shadow: '0 4px 12px rgba(16,185,129,0.22)' },
    amber: { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#fde68a', shadow: '0 4px 12px rgba(245,158,11,0.22)' },
    purple: { gradient: 'linear-gradient(135deg, #a855f7, #9333ea)', border: '#e9d5ff', shadow: '0 4px 12px rgba(168,85,247,0.22)' },
    red: { gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', border: '#fecaca', shadow: '0 4px 12px rgba(239,68,68,0.22)' },
    green: { gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', border: '#bbf7d0', shadow: '0 4px 12px rgba(34,197,94,0.22)' },
    orange: { gradient: 'linear-gradient(135deg, #f97316, #ea580c)', border: '#fed7aa', shadow: '0 4px 12px rgba(249,115,22,0.22)' },
    indigo: { gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: '#c7d2fe', shadow: '0 4px 12px rgba(99,102,241,0.22)' },
};

export const KpiCard: React.FC<KpiCardProps> = ({
    label,
    value,
    icon: Icon,
    color = 'blue',
    loading = false,
    subtitle,
}) => {
    const c = colorConfig[color];
    const valStr = String(value);

    return (
        <div
            className="kpi-card-compact"
            style={{
                background: '#fff',
                borderRadius: '0.875rem',
                padding: '0.875rem 1rem',
                border: `1.5px solid ${c.border}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                    style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        background: c.gradient,
                        boxShadow: c.shadow,
                        borderRadius: '0.625rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Icon style={{ width: '1.125rem', height: '1.125rem', color: '#fff' }} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                        style={{
                            fontSize: '0.625rem',
                            color: '#64748b',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            margin: 0,
                            marginBottom: '0.1875rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {label}
                    </p>
                    <h3
                        style={{
                            fontSize: loading ? '1.25rem' : (valStr.length > 10 ? '1rem' : '1.375rem'),
                            fontWeight: 800,
                            color: '#0f172a',
                            margin: 0,
                            lineHeight: 1.15,
                            letterSpacing: '-0.01em',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {loading ? <span style={{ color: '#cbd5e1' }}>···</span> : value}
                    </h3>
                    {subtitle && (
                        <p style={{ fontSize: '0.625rem', color: '#94a3b8', margin: 0, marginTop: '0.125rem' }}>{subtitle}</p>
                    )}
                </div>
            </div>
            <style>{`
        .kpi-card-compact:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.08) !important;
        }
      `}</style>
        </div>
    );
};
