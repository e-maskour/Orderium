import { Package, TrendingUp, TrendingDown, Award } from 'lucide-react';
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

const rankClass = (i: number) =>
  i === 0 ? 'db-rank-1' : i === 1 ? 'db-rank-2' : i === 2 ? 'db-rank-3' : 'db-rank-n';

export const TopProductsWidget: React.FC<TopProductsWidgetProps> = ({ products }) => {
  const { t, language } = useLanguage();

  const items: Product[] =
    products && products.length > 0
      ? products
      : [
          { name: 'Product A', sales: 245, revenue: 12450, trend: 12 },
          { name: 'Product B', sales: 198, revenue: 9890, trend: -5 },
          { name: 'Product C', sales: 167, revenue: 8350, trend: 8 },
          { name: 'Product D', sales: 145, revenue: 7250, trend: 15 },
          { name: 'Product E', sales: 132, revenue: 6600, trend: 3 },
        ];

  const maxSales = Math.max(...items.map((p) => p.sales), 1);

  return (
    <div className="db-chart-card">
      {/* Header */}
      <div className="db-chart-header">
        <div className="db-chart-header-left">
          <div
            className="db-chart-icon"
            style={{
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              boxShadow: '0 4px 10px rgba(217,119,6,0.28)',
            }}
          >
            <Award
              style={{ width: '1.125rem', height: '1.125rem', color: '#fff' }}
              strokeWidth={2}
            />
          </div>
          <div>
            <h3 className="db-chart-title">{t('topProducts')}</h3>
            <p className="db-chart-subtitle">{t('bestSellers')}</p>
          </div>
        </div>
        <span
          className="db-chart-badge"
          style={{
            background: '#fffbeb',
            color: '#d97706',
            border: '1px solid #fde68a',
          }}
        >
          Top {items.length}
        </span>
      </div>

      {/* Product rows */}
      <div style={{ padding: '0.5rem 0 0.5rem' }}>
        {items.map((product, index) => (
          <div key={index} className="db-product-row">
            {/* Rank badge */}
            <div
              className={rankClass(index)}
              style={{
                width: '1.625rem',
                height: '1.625rem',
                borderRadius: '0.4375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6875rem',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {index + 1}
            </div>

            {/* Name + sales bar */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <p
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {product.name}
                </p>
                <span
                  style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, flexShrink: 0 }}
                >
                  {product.sales} {t('sales').toLowerCase()}
                </span>
              </div>
              {/* Progress bar */}
              <div className="db-product-bar" style={{ marginTop: '0.375rem' }}>
                <div
                  className="db-product-bar-fill"
                  style={{
                    width: `${(product.sales / maxSales) * 100}%`,
                    background:
                      index === 0
                        ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                        : index === 1
                          ? 'linear-gradient(90deg,#94a3b8,#64748b)'
                          : index === 2
                            ? 'linear-gradient(90deg,#fb923c,#ea580c)'
                            : 'linear-gradient(90deg,#235ae4,#1a47b8)',
                  }}
                />
              </div>
            </div>

            {/* Revenue + trend */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCurrency(product.revenue, language)}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.2rem',
                  marginTop: '0.125rem',
                }}
              >
                {product.trend >= 0 ? (
                  <TrendingUp
                    style={{ width: '0.6875rem', height: '0.6875rem', color: '#16a34a' }}
                    strokeWidth={2.5}
                  />
                ) : (
                  <TrendingDown
                    style={{ width: '0.6875rem', height: '0.6875rem', color: '#dc2626' }}
                    strokeWidth={2.5}
                  />
                )}
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: product.trend >= 0 ? '#16a34a' : '#dc2626',
                  }}
                >
                  {product.trend >= 0 ? '+' : ''}
                  {product.trend}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
