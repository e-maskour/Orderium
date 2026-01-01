import { Product, ProductFilters } from '@/types/database';
import { ProductCard } from './ProductCard';
import { useLanguage } from '@/context/LanguageContext';
import { productTranslations } from '@/data/mockProducts';
import { Package, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

interface ProductGridProps {
  products: Product[];
  filters: ProductFilters;
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export const ProductGrid = ({ 
  products, 
  filters, 
  isLoading, 
  currentPage, 
  totalPages, 
  totalCount,
  onPageChange 
}: ProductGridProps) => {
  const { language, t, dir } = useLanguage();

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3" dir={dir}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse">
            <div className="aspect-square bg-gray-200" />
            <div className="p-2 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-8 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isLoading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" dir={dir}>
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          {filters.search ? (
            <Search className="w-12 h-12 text-gray-300" />
          ) : (
            <Package className="w-12 h-12 text-gray-300" />
          )}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {filters.search ? t('noResults') : t('noProductsInCategory')}
        </h3>
        <p className="text-gray-500 max-w-md">
          {filters.search ? t('noResultsMessage') : t('tryDifferentCategory')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Product Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {products.map((product, index) => (
          <div
            key={product.Id}
            style={{ animationDelay: `${index * 20}ms` }}
            className="animate-fade-in"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Pagination Controls - Show info even with 1 page */}
      <div className="flex items-center justify-center gap-3 border-t border-gray-200 pt-6 pb-2">
        {totalPages > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              type="button"
              className="flex items-center gap-2 h-11 px-5 rounded-lg font-medium bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {dir === 'rtl' ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
              <span>{t('previous')}</span>
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => {
                      onPageChange(pageNum);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                      currentPage === pageNum
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-primary hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              type="button"
              className="flex items-center gap-2 h-11 px-5 rounded-lg font-medium bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              <span>{t('next')}</span>
              {dir === 'rtl' ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          </>
        )}
        
        {/* Product count info */}
        <div className="text-sm text-gray-500">
          {totalCount > 0 && (
            language === 'ar' 
              ? `${totalCount} منتج`
              : `${totalCount} produits`
          )}
        </div>
      </div>
    </div>
  );
};
