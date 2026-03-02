import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { ProductFilters, ProductCategory } from '@/types/database';
import { useProducts } from "@/hooks/useProducts";
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { CategoryChips } from '@/components/CategoryChips';
import { ProductGrid } from '@/components/ProductGrid';
import { CartDrawer } from '@/components/CartDrawer';
import { FloatingCartButton } from '@/components/FloatingCartButton';
import { useCart } from '@/context/CartContext';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Grid3x3, List } from 'lucide-react';

const Index = () => {
  const { t, dir } = useLanguage();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<ProductFilters>({
    category: 'all',
    search: '',
  });

  const handleCategoryChange = (category: ProductCategory) => {
    setFilters((prev) => ({ ...prev, category }));
    setCurrentPage(1);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (!isResizing) return;
    e.preventDefault();
    const newWidth = dir === 'rtl'
      ? window.innerWidth - e.clientX
      : e.clientX;
    const minWidth = 280;
    const maxWidth = Math.min(600, window.innerWidth * 0.5);
    setSidebarWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
  };

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);

      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResizing);
      };
    }
  }, [isResizing, dir]);

  const { products, loading, error, totalCount, totalPages } = useProducts({
    page: currentPage,
    pageSize: 24,
    search: filters.search,
  });

  const filteredProducts = products.filter((product) => {
    if (filters.category === 'products' && product.isService) return false;
    if (filters.category === 'services' && !product.isService) return false;
    return true;
  });

  const { itemCount } = useCart();

  return (
    <div className="surface-ground" style={{ minHeight: '100vh' }} dir={dir}>
      <Header onCartClick={() => setIsCartOpen(true)} />

      <div className="flex" style={{ minHeight: 'calc(100vh - 4rem)' }}>
        {/* Desktop Cart Panel */}
        <aside
          className="hidden lg:block surface-card relative overflow-hidden"
          style={{
            width: `${sidebarWidth}px`,
            position: 'sticky',
            top: '4rem',
            height: 'calc(100vh - 4rem)',
            [dir === 'rtl' ? 'borderInlineStart' : 'borderInlineEnd']: '1px solid var(--surface-border)',
          }}
        >
          <CartDrawer isOpen={true} onClose={() => { }} isPanelMode={true} />
          <div
            onMouseDown={startResizing}
            className="absolute"
            style={{
              [dir === 'rtl' ? 'left' : 'right']: 0,
              top: 0,
              bottom: 0,
              width: '0.5rem',
              cursor: 'col-resize',
              zIndex: 50,
              background: isResizing ? 'rgba(37,99,235,0.2)' : 'transparent',
              transition: 'background 0.2s',
            }}
          >
            <div
              className="absolute"
              style={{
                [dir === 'rtl' ? 'left' : 'right']: 0,
                top: 0,
                bottom: 0,
                width: '1px',
                background: 'var(--surface-300)',
              }}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-column overflow-hidden" style={{ height: '100%' }}>
          <div className="surface-card border-bottom-1 surface-border shadow-1 flex-shrink-0">
            <div className="px-3 sm:px-4 py-3">
              <SearchBar value={filters.search} onChange={handleSearchChange} />
            </div>
          </div>

          <div className="surface-card border-bottom-1 surface-border px-3 sm:px-4 lg:px-5 py-3 flex-shrink-0">
            <div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center gap-3">
              <CategoryChips
                activeCategory={filters.category}
                onCategoryChange={handleCategoryChange}
              />

              {/* View Mode Toggle */}
              <div className="flex align-items-center gap-2 border-round-lg p-1" style={{ background: 'var(--surface-100)' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className="border-none cursor-pointer border-round-md px-3 py-1 text-sm font-medium"
                  style={{
                    background: viewMode === 'grid' ? 'var(--surface-card)' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--text-color)' : 'var(--text-color-secondary)',
                    boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <Grid3x3 style={{ width: '1rem', height: '1rem' }} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="border-none cursor-pointer border-round-md px-3 py-1 text-sm font-medium"
                  style={{
                    background: viewMode === 'list' ? 'var(--surface-card)' : 'transparent',
                    color: viewMode === 'list' ? 'var(--text-color)' : 'var(--text-color-secondary)',
                    boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <List style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-3 sm:px-4 py-3 sm:py-4">
              {loading && (
                <div className="flex flex-column align-items-center justify-content-center py-6">
                  <ProgressSpinner style={{ width: '2rem', height: '2rem' }} strokeWidth="4" />
                  <p className="text-color-secondary mt-3">{t('loading')}</p>
                </div>
              )}

              {error && (
                <div className="text-center py-6">
                  <p className="mb-3" style={{ color: '#ef4444' }}>{error}</p>
                  <Button
                    label={t('retry')}
                    link
                    onClick={() => window.location.reload()}
                  />
                </div>
              )}

              {!loading && !error && (
                <ProductGrid
                  products={filteredProducts}
                  filters={filters}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  onPageChange={handlePageChange}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Cart Drawer */}
      <div className="lg:hidden">
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          isPanelMode={false}
        />
      </div>

      <FloatingCartButton onClick={() => setIsCartOpen(true)} />
    </div>
  );
};

export default Index;
