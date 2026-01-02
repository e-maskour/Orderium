import { useState, useEffect, useRef } from 'react';
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
import { Button } from '@/components/ui/button';
import { Grid3x3, List } from 'lucide-react';

const Index = () => {
  const { t, dir } = useLanguage();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px (w-80)
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<ProductFilters>({
    category: 'all',
    search: '',
  });

  const handleCategoryChange = (category: ProductCategory) => {
    setFilters((prev) => ({ ...prev, category }));
    setCurrentPage(1); // Reset to page 1 when category changes
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setCurrentPage(1); // Reset to page 1 when search changes
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
    // Min 280px, Max 600px or 50% of window width
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

  // Pass pagination params to useProducts
  const { products, loading, error, totalCount, totalPages } = useProducts({
    page: currentPage,
    pageSize: 18,
    search: filters.search,
  });

  // Filter products by category on client side (since category filtering is simple)
  const filteredProducts = products.filter((product) => {
    if (filters.category === 'products' && product.IsService) return false;
    if (filters.category === 'services' && !product.IsService) return false;
    return true;
  });

  const { itemCount } = useCart();
  
  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      <Header onCartClick={() => setIsCartOpen(true)} />

      {/* Desktop: 2-column layout | Mobile: single column with drawer */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop Cart Panel - Left Side */}
        <aside 
          className={`hidden lg:block bg-white ${dir === 'rtl' ? 'border-s' : 'border-e'} border-gray-200 sticky top-16 h-[calc(100vh-4rem)] overflow-hidden relative`}
          style={{ width: `${sidebarWidth}px` }}
        >
          <CartDrawer 
            isOpen={true} 
            onClose={() => {}} 
            isPanelMode={true}
          />
          
          {/* Resize Handle */}
          <div
            onMouseDown={startResizing}
            className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-0 bottom-0 w-2 hover:w-3 cursor-col-resize transition-all z-50 group`}
            style={{ 
              background: isResizing ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
            }}
          >
            <div 
              className={`absolute inset-y-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-px bg-gray-300 group-hover:bg-primary group-hover:w-0.5 transition-all`}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {/* Sticky Search and Categories */}
          <div className="sticky top-14 sm:top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
              {/* Search Bar */}
              <SearchBar value={filters.search} onChange={handleSearchChange} />
              
              {/* Category Chips and View Toggle */}
              <div className="flex items-center justify-between gap-3">
                <CategoryChips
                  activeCategory={filters.category}
                  onCategoryChange={handleCategoryChange}
                />
                
                {/* View Toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-9 px-3 min-w-[100px]"
                  >
                    <Grid3x3 className="w-4 h-4 me-2" />
                    <span className="text-xs sm:text-sm whitespace-nowrap">{t('gridView')}</span>
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-9 px-3 min-w-[100px]"
                  >
                    <List className="w-4 h-4 me-2" />
                    <span className="text-xs sm:text-sm whitespace-nowrap">{t('listView')}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 sm:pb-24 lg:pb-8">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground">{t('loading')}</p>
              </div>
            )}
            
            {error && (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="text-primary hover:underline"
                >
                  {t('retry')}
                </button>
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

      {/* Floating Cart Button (mobile only) */}
      <FloatingCartButton onClick={() => setIsCartOpen(true)} />
    </div>
  );
};

export default Index;
