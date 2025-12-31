import { Product, ProductFilters } from '@/types/database';
import { ProductCard } from './ProductCard';
import { useLanguage } from '@/context/LanguageContext';
import { productTranslations } from '@/data/mockProducts';
import { Package } from 'lucide-react';
import { useMemo } from 'react';

interface ProductGridProps {
  products: Product[];
  filters: ProductFilters;
  isLoading?: boolean;
}

export const ProductGrid = ({ products, filters, isLoading }: ProductGridProps) => {
  const { language, t, dir } = useLanguage();

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Category filter
      if (filters.category === 'products' && product.IsService) return false;
      if (filters.category === 'services' && !product.IsService) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const translation = productTranslations[product.Id];
        
        const nameMatch = product.Name.toLowerCase().includes(searchLower) ||
          (translation && translation.name.toLowerCase().includes(searchLower));
        
        const descMatch = product.Description?.toLowerCase().includes(searchLower) ||
          (translation && translation.description.toLowerCase().includes(searchLower));
        
        const codeMatch = product.Code?.toLowerCase().includes(searchLower);

        if (!nameMatch && !descMatch && !codeMatch) return false;
      }

      // Only enabled products
      return product.IsEnabled;
    });
  }, [products, filters]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" dir={dir}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-card animate-pulse">
            <div className="aspect-square bg-secondary" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-secondary rounded w-3/4" />
              <div className="h-3 bg-secondary rounded w-1/2" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-5 bg-secondary rounded w-20" />
                <div className="h-10 bg-secondary rounded w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" dir={dir}>
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('noResults')}
        </h3>
        <p className="text-muted-foreground">
          {language === 'ar' 
            ? 'جرب البحث بكلمات أخرى'
            : 'Essayez avec d\'autres termes'
          }
        </p>
      </div>
    );
  }

  return (
    <div 
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      dir={dir}
    >
      {filteredProducts.map((product, index) => (
        <div
          key={product.Id}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
};
