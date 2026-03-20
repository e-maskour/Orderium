import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Gauge } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatNumber } from '../../lib/formatters';

interface PerformanceMetricsProps {
    metrics: {
        avgOrderValue: number;
        avgOrderValueChange: number;
        customerGrowth: number;
        customerGrowthChange: number;
        conversionRate: number;
        conversionRateChange: number;
    };
}

const iconConfig = {
    revenue:   { Component: DollarSign, gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',   shadow: 'rgba(22,163,74,0.22)',   progress: '#22c55e' },
    customers: { Component: Users,       gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',  shadow: 'rgba(124,58,237,0.22)',  progress: '#8b5cf6' },
    orders:    { Component: ShoppingCart, gradient: 'linear-gradient(135deg,#235ae4,#1a47b8)', shadow: 'rgba(35,90,228,0.22)',   progress: '#235ae4' },
};

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics }) => {
    const { t, language } = useLanguage();

    const metricsData = [
        {
            label: t('avgOrderValue'),
            value: formatCurrency(metrics.avgOrderValue, language),
            change: metrics.avgOrderValueChange,
            icon: 'revenue' as const,
            progress: Math.min((metrics.avgOrderValue / 500) * 100, 100),
        },
        {
            label: t('customerGrowth'),
            value: `${metrics.customerGrowth}`,
            change: metrics.customerGrowthChange,
            icon: 'customers' as const,
            progress: Math.min((metrics.customerGrowth / 1000) * 100, 100),
        },
        {
            label: t('conversionRate'),
            value: `${formatNumber(metrics.conversionRate, 1)}%`,
            change: metrics.conversionRateChange,
            icon: 'orders' as const,
            progress: Math.min(metrics.conversionRate, 100),
        },
    ];

    return (
        <div className="db-chart-card">
            {/* Card header */}
            <div className="db-chart-header">
                <div className="db-chart-header-left">
                    <div className="db-chart-icon" style={{
                        background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                        boxShadow: '0 4px 10px rgba(99,102,241,0.28)',
                    }}>
                        <Gauge style={{ width: '1.125rem', height: '1.125rem', color: '#fff' }} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="db-chart-title">{t('performanceMetrics')}</h3>
                        <p className="db-chart-subtitle">{t('keyIndicators')}</p>
                    </div>
                </div>
            </div>

            {/* Metrics list */}
            <div style={{ padding: '0.75rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {metricsData.map((metric, index) => {
                    const config = iconConfig[metric.icon];
                    const Icon = config.Component;
                    const isPositive = metric.change >= 0;

                    return (
                        <div key={index} className="db-metric-row">
                            <div className="db-metric-row-top">
                                {/* Icon + label + value */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        width: '2.375rem', height: '2.375rem', borderRadius: '0.625rem',
                                        background: config.gradient,
                                        boxShadow: `0 3px 8px ${config.shadow}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <Icon style={{ width: '1.0625rem', height: '1.0625rem', color: '#fff' }} strokeWidth={2} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8',
                                            margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em',
                                        }}>
                                            {metric.label}
                                        </p>
                                        <p style={{
                                            fontSize: '1.1875rem', fontWeight: 800, color: '#0f172a',
                                            margin: '0.0625rem 0 0', letterSpacing: '-0.02em',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            {metric.value}
                                        </p>
                                    </div>
                                </div>

                                {/* Trend badge */}
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                    padding: '0.25rem 0.625rem', borderRadius: '2rem',
                                    backgroundColor: isPositive ? '#f0fdf4' : '#fff1f2',
                                    border: `1px solid ${isPositive ? '#dcfce7' : '#fecdd3'}`,
                                    flexShrink: 0,
                                }}>
                                    {isPositive
                                        ? <TrendingUp style={{ width: '0.6875rem', height: '0.6875rem', color: '#16a34a' }} strokeWidth={2.5} />
                                        : <TrendingDown style={{ width: '0.6875rem', height: '0.6875rem', color: '#e11d48' }} strokeWidth={2.5} />
                                    }
                                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: isPositive ? '#16a34a' : '#e11d48' }}>
                                        {isPositive ? '+' : ''}{metric.change}%
                                    </span>
                                </div>
                            </div>

                            {/* Mini progress bar */}
                            <div className="db-metric-progress" style={{ marginTop: '0.625rem' }}>
                                <div
                                    className="db-metric-progress-fill"
                                    style={{ width: `${metric.progress}%`, background: config.gradient }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
