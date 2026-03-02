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

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'revenue':
        return DollarSign;
      case 'customers':
        return Users;
      case 'orders':
        return ShoppingCart;
      default:
        return TrendingUp;
    }
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '0.75rem',
      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
      border: '1px solid rgba(226,232,240,0.6)',
      padding: '1.25rem',
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{t('performanceMetrics')}</h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{t('keyIndicators')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {metricsData.map((metric, index) => {
          const Icon = getIcon(metric.icon);
          const isPositive = metric.change >= 0;

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(248,250,252,0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon style={{ width: '1.25rem', height: '1.25rem', color: '#475569' }} strokeWidth={2} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', margin: 0 }}>{metric.label}</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginTop: '0.125rem' }}>{metric.value}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isPositive ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f0fdf4',
                  }}>
                    <TrendingUp style={{ width: '1rem', height: '1rem', color: '#16a34a' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#16a34a' }}>
                      +{metric.change}%
                    </span>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fef2f2',
                  }}>
                    <TrendingDown style={{ width: '1rem', height: '1rem', color: '#dc2626' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#dc2626' }}>
                      {metric.change}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
