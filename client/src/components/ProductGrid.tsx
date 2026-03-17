import { Product, ProductFilters } from '@/types/database';
import { ProductCard } from './ProductCard';
import { useLanguage } from '@/context/LanguageContext';
import { Package, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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
  onPageChange,
  viewMode = 'grid',
}: ProductGridProps) => {
  const { t, dir } = useLanguage();

  const handlePrev = () => { if (currentPage > 1) { onPageChange(currentPage - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const handleNext = () => { if (currentPage < totalPages) { onPageChange(currentPage + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };

  // Skeleton
  if (isLoading) {
    return (
      <div className="cl-product-grid" dir={dir}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ borderRadius: '0.75rem', overflow: 'hidden', background: 'white', border: '1.5px solid #e5e7eb' }}>
            <div className="cl-skeleton" style={{ aspectRatio: '4/3' }} />
            <div style={{ padding: '0.5rem 0.625rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div className="cl-skeleton" style={{ height: '0.75rem', width: '80%' }} />
              <div className="cl-skeleton" style={{ height: '0.875rem', width: '50%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="cl-empty" dir={dir}>
        <div className="cl-empty-icon">
          {filters.search
            ? <Search style={{ width: '2.5rem', height: '2.5rem', color: '#d1d5db' }} />
            : <Package style={{ width: '2.5rem', height: '2.5rem', color: '#d1d5db' }} />
          }
        </div>
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-color)' }}>
          {filters.search ? t('noResults') : t('noProductsInCategory')}
        </h3>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-color-secondary)', fontSize: '0.9375rem', maxWidth: '24rem' }}>
          {filters.search ? t('noResultsMessage') : t('tryDifferentCategory')}
        </p>
      </div>
    );
  }

  // Page numbers helper
  const pageNums = (() => {
    const total = Math.min(5, totalPages);
    const arr: number[] = [];
    let start = 1;
    if (totalPages > 5) {
      if (currentPage <= 3) start = 1;
      else if (currentPage >= totalPages - 2) start = totalPages - 4;
      else start = currentPage - 2;
    }
    for (let i = 0; i < total; i++) arr.push(start + i);
    return arr;
  })();

  return (
    <div dir={dir} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Grid or list */}
      {viewMode === 'grid' ? (
        <div className="cl-product-grid">
          {products.map((p, i) => <ProductCard key={`${p.id}-${i}`} product={p} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {products.map((p, i) => <ProductCard key={`${p.id}-${i}`} product={p} viewMode="list" />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="cl-pagination" dir={dir}>
          <button className="cl-page-btn" onClick={handlePrev} disabled={currentPage === 1} aria-label={t('previous')}>
            {dir === 'rtl' ? <ChevronRight style={{ width: '1rem', height: '1rem' }} /> : <ChevronLeft style={{ width: '1rem', height: '1rem' }} />}
          </button>

          {pageNums.map(n => (
            <button
              key={n}
              className={`cl-page-btn${n === currentPage ? ' active' : ''}`}
              onClick={() => { onPageChange(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              {n}
            </button>
          ))}

          <button className="cl-page-btn" onClick={handleNext} disabled={currentPage === totalPages} aria-label={t('next')}>
            {dir === 'rtl' ? <ChevronLeft style={{ width: '1rem', height: '1rem' }} /> : <ChevronRight style={{ width: '1rem', height: '1rem' }} />}
          </button>
        </div>
      )}
    </div>
  );
};
