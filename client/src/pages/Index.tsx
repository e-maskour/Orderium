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
import { ProgressSpinner } from 'primereact/progressspinner';
import { Grid3x3, List, Home, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Index = () => {
  const { t, dir } = useLanguage();
  const location = useLocation();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<ProductFilters>({ category: 'all', search: '' });

  const handleCategoryChange = (category: ProductCategory) => {
    setFilters(prev => ({ ...prev, category }));
    setCurrentPage(1);
  };

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setCurrentPage(1);
  };

  const startResizing = (e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); };
  const stopResizing = () => setIsResizing(false);

  const resize = (e: MouseEvent) => {
    if (!isResizing) return;
    e.preventDefault();
    const newWidth = dir === 'rtl' ? window.innerWidth - e.clientX : e.clientX;
    setSidebarWidth(Math.max(280, Math.min(newWidth, Math.min(600, window.innerWidth * 0.5))));
  };

  useEffect(() => {
    if (!isResizing) return;
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
  }, [isResizing, dir]);

  const { products, loading, error, totalCount, totalPages } = useProducts({
    page: currentPage,
    pageSize: 24,
    search: filters.search,
  });

  const filteredProducts = products.filter(p => {
    if (filters.category === 'products' && p.isService) return false;
    if (filters.category === 'services' && !p.isService) return false;
    return true;
  });

  const { itemCount } = useCart();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-ground)' }} dir={dir}>
      <Header onCartClick={() => setIsCartOpen(true)} />

      <div className="flex" style={{ minHeight: 'calc(100vh - 3.75rem)' }}>
        {/* ── Desktop Cart Panel ── */}
        <aside
          className="hidden lg:flex flex-column surface-card"
          style={{
            width: `${sidebarWidth}px`,
            position: 'sticky',
            top: '3.75rem',
            height: 'calc(100vh - 3.75rem)',
            flexShrink: 0,
            [dir === 'rtl' ? 'borderInlineStart' : 'borderInlineEnd']: '1px solid var(--surface-border)',
            boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
          }}
        >
          <CartDrawer isOpen={true} onClose={() => {}} isPanelMode={true} />
          {/* Resize handle */}
          <div
            onMouseDown={startResizing}
            style={{
              position: 'absolute',
              [dir === 'rtl' ? 'left' : 'right']: 0,
              top: 0, bottom: 0, width: '6px',
              cursor: 'col-resize', zIndex: 50,
              background: isResizing ? 'rgba(5,150,105,0.15)' : 'transparent',
              transition: 'background 0.2s',
            }}
          />
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 flex flex-column" style={{ minWidth: 0, overflow: 'hidden' }}>
          {/* Search strip */}
          <div style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--surface-border)', padding: '0.75rem 1rem', flexShrink: 0 }}>
            <SearchBar value={filters.search} onChange={handleSearchChange} />
          </div>

          {/* Category + view-mode strip */}
          <div style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--surface-border)', padding: '0.5rem 1rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <CategoryChips activeCategory={filters.category} onCategoryChange={handleCategoryChange} />

              {/* View mode toggle */}
              <div className="cl-view-toggle" style={{ flexShrink: 0 }}>
                <button className={`cl-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} aria-label="Grid view">
                  <Grid3x3 style={{ width: '1rem', height: '1rem' }} />
                </button>
                <button className={`cl-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} aria-label="List view">
                  <List style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>
            </div>
          </div>

          {/* Product area */}
          <div className="flex-1 overflow-y-auto cl-pb-nav" style={{ padding: '0.875rem 1rem' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1rem' }}>
                <ProgressSpinner style={{ width: '2rem', height: '2rem' }} strokeWidth="4" />
                <p style={{ color: 'var(--text-color-secondary)', margin: 0 }}>{t('loading')}</p>
              </div>
            )}

            {error && !loading && (
              <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
                <button onClick={() => window.location.reload()} style={{ color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
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
                onPageChange={setCurrentPage}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            )}
          </div>
        </main>
      </div>

      {/* ── Mobile Cart Drawer ── */}
      <div className="lg:hidden">
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} isPanelMode={false} />
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="cl-bottom-nav lg:hidden" dir={dir}>
        <Link to="/" className={`cl-bottom-nav-item${location.pathname === '/' ? ' active' : ''}`}>
          <Home style={{ width: '1.375rem', height: '1.375rem' }} />
          <span>{t('home') || 'Accueil'}</span>
        </Link>

        <Link to="/my-orders" className={`cl-bottom-nav-item${location.pathname === '/my-orders' ? ' active' : ''}`}>
          <ClipboardList style={{ width: '1.375rem', height: '1.375rem' }} />
          <span>{t('orders') || 'Commandes'}</span>
        </Link>

        {/* Cart FAB in the middle */}
        <button className="cl-bottom-cart-btn" onClick={() => setIsCartOpen(true)} aria-label={t('cart') || 'Panier'}>
          <ShoppingBag style={{ width: '1.5rem', height: '1.5rem' }} />
          {itemCount > 0 && <span className="cl-bottom-cart-badge">{itemCount}</span>}
        </button>

        <Link to="/profile" className={`cl-bottom-nav-item${location.pathname === '/profile' ? ' active' : ''}`}>
          <User style={{ width: '1.375rem', height: '1.375rem' }} />
          <span>{t('profile') || 'Profil'}</span>
        </Link>

        <div style={{ flex: 1 }} /> {/* spacer */}
      </nav>

      {/* Floating cart fallback for non-bottom-nav screens */}
      <FloatingCartButton onClick={() => setIsCartOpen(true)} />
    </div>
  );
};

export default Index;
