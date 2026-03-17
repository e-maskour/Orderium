import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatNumber } from '../../lib/formatters';

interface Metric {
    label: string;
    value: string;
    change: number;
    icon: 'revenue' | 'orders' | 'customers';
}

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
    revenue: { Component: DollarSign, bg: 'linear-gradient(135deg, #22c55e, #16a34a)', shadow: 'rgba(22,163,74,0.22)' },
    customers: { Component: Users, bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', shadow: 'rgba(124,58,237,0.22)' },
    orders: { Component: ShoppingCart, bg: 'linear-gradient(135deg, #235ae4, #1a47b8)', shadow: 'rgba(35,90,228,0.22)' },
};

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics }) => {
    const { t, language } = useLanguage();

    const metricsData: Metric[] = [
        {
            label: t('avgOrderValue'),
            value: formatCurrency(metrics.avgOrderValue, language),
            change: metrics.avgOrderValueChange,
            icon: 'revenue',
        },
        {
            label: t('customerGrowth'),
            value: `${metrics.customerGrowth}`,
            change: metrics.customerGrowthChange,
            icon: 'customers',
        },
        {
            label: t('conversionRate'),
            value: `${formatNumber(metrics.conversionRate, 2)}%`,
            change: metrics.conversionRateChange,
            icon: 'orders',
        },
    ];

    return (
        <div style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                    {t('performanceMetrics')}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    {t('keyIndicators')}
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {metricsData.map((metric, index) => {
                    const config = iconConfig[metric.icon];
                    const Icon = config.Component;
                    const isPositive = metric.change >= 0;

                    return (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.875rem',
                                borderRadius: '0.75rem',
                                background: '#f9fafb',
                                border: '1px solid #f3f4f6',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    borderRadius: '0.625rem',
                                    background: config.bg,
                                    boxShadow: `0 4px 10px ${config.shadow}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Icon style={{ width: '1.125rem', height: '1.125rem', color: '#fff' }} strokeWidth={2} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                        {metric.label}
                                    </p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginTop: '0.125rem', letterSpacing: '-0.01em' }}>
                                        {metric.value}
                                    </p>
                                </div>
                            </div>

                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.25rem 0.625rem',
                                borderRadius: '2rem',
                                backgroundColor: isPositive ? '#f0fdf4' : '#fff1f2',
                                border: `1px solid ${isPositive ? '#dcfce7' : '#fecdd3'}`,
                            }}>
                                {isPositive
                                    ? <TrendingUp style={{ width: '0.75rem', height: '0.75rem', color: '#16a34a' }} strokeWidth={2.5} />
                                    : <TrendingDown style={{ width: '0.75rem', height: '0.75rem', color: '#e11d48' }} strokeWidth={2.5} />
                                }
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isPositive ? '#16a34a' : '#e11d48' }}>
                                    {isPositive ? '+' : ''}{metric.change}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
