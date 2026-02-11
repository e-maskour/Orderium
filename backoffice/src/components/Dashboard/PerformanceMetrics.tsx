import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/utils';
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800">{t('performanceMetrics')}</h3>
        <p className="text-sm text-slate-500 mt-1">{t('keyIndicators')}</p>
      </div>
      
      <div className="space-y-3">
        {metricsData.map((metric, index) => {
          const Icon = getIcon(metric.icon);
          const isPositive = metric.change >= 0;
          
          return (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                  <Icon className="w-5 h-5 text-slate-600" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{metric.value}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-green-600">
                      +{metric.change}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-bold text-red-600">
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
