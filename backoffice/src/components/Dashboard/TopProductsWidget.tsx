import { Package, TrendingUp } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../lib/formatters';

interface Product {
  name: string;
  sales: number;
  revenue: number;
  trend: number;
}

interface TopProductsWidgetProps {
  products?: Product[];
}

export const TopProductsWidget: React.FC<TopProductsWidgetProps> = ({ products }) => {
  const { t, language } = useLanguage();

  const defaultProducts: Product[] = products || [
    { name: 'Product A', sales: 245, revenue: 12450, trend: 12 },
    { name: 'Product B', sales: 198, revenue: 9890, trend: -5 },
    { name: 'Product C', sales: 167, revenue: 8350, trend: 8 },
    { name: 'Product D', sales: 145, revenue: 7250, trend: 15 },
    { name: 'Product E', sales: 132, revenue: 6600, trend: 3 },
  ];

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid rgba(226,232,240,0.6)', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{t('topProducts')}</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{t('bestSellers')}</p>
        </div>
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '0.75rem',
          backgroundColor: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Package style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {defaultProducts.map((product, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem',
              borderRadius: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <div style={{
                width: '1.75rem',
                height: '1.75rem',
                borderRadius: '0.5rem',
                background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}>
                {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  {product.name}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                  {product.sales} {t('sales').toLowerCase()}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  {formatCurrency(product.revenue, language)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', marginTop: '0.125rem' }}>
                  <TrendingUp
                    style={{
                      width: '0.75rem',
                      height: '0.75rem',
                      color: product.trend >= 0 ? '#16a34a' : '#dc2626',
                      transform: product.trend >= 0 ? 'none' : 'rotate(180deg)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: product.trend >= 0 ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {product.trend >= 0 ? '+' : ''}{product.trend}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
