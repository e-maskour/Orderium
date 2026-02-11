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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{t('topProducts')}</h3>
          <p className="text-sm text-slate-500 mt-1">{t('bestSellers')}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Package className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      <div className="space-y-3">
        {defaultProducts.map((product, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50/50 transition-colors group"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {product.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {product.sales} {t('sales').toLowerCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">
                  {formatCurrency(product.revenue, language)}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <TrendingUp
                    className={`w-3 h-3 ${
                      product.trend >= 0 ? 'text-green-600' : 'text-red-600 rotate-180'
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      product.trend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
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
