import { Product, ProductFilters } from '@/types/database';
import { ProductCard } from './ProductCard';
import { useLanguage } from '@/context/LanguageContext';
import { Package, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';

interface ProductGridProps {
  products: Product[];
  filters: ProductFilters;
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export const ProductGrid = ({
  products,
  filters,
  isLoading,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  viewMode = 'grid',
  onViewModeChange
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
      <div className="grid" dir={dir} style={{ gap: '0.5rem' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="col-6 sm:col-4 md:col-3 lg:col-2">
            <div className="surface-card border-round-lg overflow-hidden shadow-1 animate-pulse">
              <div style={{ aspectRatio: '1', background: '#e5e7eb' }} />
              <div className="p-2 flex flex-column gap-2">
                <div style={{ height: '0.75rem', background: '#e5e7eb', borderRadius: '0.25rem', width: '75%' }} />
                <div style={{ height: '1rem', background: '#e5e7eb', borderRadius: '0.25rem', width: '50%' }} />
                <div style={{ height: '2rem', background: '#e5e7eb', borderRadius: '0.25rem' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isLoading && products.length === 0) {
    return (
      <div className="flex flex-column align-items-center justify-content-center py-6 text-center" dir={dir}>
        <div className="flex align-items-center justify-content-center border-circle mb-4" style={{ width: '6rem', height: '6rem', background: '#f3f4f6' }}>
          {filters.search ? (
            <Search style={{ width: '3rem', height: '3rem', color: '#d1d5db' }} />
          ) : (
            <Package style={{ width: '3rem', height: '3rem', color: '#d1d5db' }} />
          )}
        </div>
        <h3 className="text-xl font-semibold text-color mb-2">
          {filters.search ? t('noResults') : t('noProductsInCategory')}
        </h3>
        <p className="text-color-secondary" style={{ maxWidth: '28rem' }}>
          {filters.search ? t('noResultsMessage') : t('tryDifferentCategory')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-column gap-4" dir={dir}>
      {/* Product Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid" style={{ gap: '0.5rem' }}>
          {products.map((product, index) => (
            <div
              key={`${product.id}-${index}`}
              className="col-6 sm:col-4 md:col-3 lg:col-2"
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-column gap-2">
          {products.map((product, index) => (
            <div
              key={`${product.id}-${index}`}
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <ProductCard product={product} viewMode="list" />
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex flex-column sm:flex-row align-items-center justify-content-center gap-2 pt-4 border-top-1 surface-border pb-2">
        {totalPages > 1 && (
          <>
            <Button
              text
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="flex align-items-center gap-2 px-3 border-round-lg font-medium surface-card border-2 surface-border text-color"
              style={{ height: '2.5rem', opacity: currentPage === 1 ? 0.4 : 1, transition: 'all 0.2s' }}
            >
              {dir === 'rtl' ? (
                <ChevronRight style={{ width: '1rem', height: '1rem' }} />
              ) : (
                <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
              )}
              <span className="hidden sm:inline text-sm">{t('previous')}</span>
            </Button>

            <div className="flex align-items-center gap-1">
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
                  <Button
                    key={pageNum}
                    text={currentPage !== pageNum}
                    onClick={() => {
                      onPageChange(pageNum);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex align-items-center justify-content-center border-round-lg font-semibold text-sm"
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      padding: 0,
                      background: currentPage === pageNum ? 'var(--primary-color)' : 'var(--surface-card)',
                      color: currentPage === pageNum ? 'white' : 'var(--text-color)',
                      border: currentPage === pageNum ? 'none' : '1px solid var(--surface-border)',
                      boxShadow: currentPage === pageNum ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              text
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex align-items-center gap-2 px-3 border-round-lg font-medium surface-card border-2 surface-border text-color"
              style={{ height: '2.5rem', opacity: currentPage === totalPages ? 0.4 : 1, transition: 'all 0.2s' }}
            >
              <span className="hidden sm:inline text-sm">{t('next')}</span>
              {dir === 'rtl' ? (
                <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
              ) : (
                <ChevronRight style={{ width: '1rem', height: '1rem' }} />
              )}
            </Button>
          </>
        )}

        {/* Product count info */}
        <div className="text-sm text-color-secondary">
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
