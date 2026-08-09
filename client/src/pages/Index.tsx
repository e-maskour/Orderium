import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Tag } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ProductFilters } from '@/types/database';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useBrands } from '@/hooks/useBrands';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { FilterTiles } from '@/components/FilterTiles';
import { ProductGrid } from '@/components/ProductGrid';
import { CartDrawer } from '@/components/CartDrawer';
import { BottomNav } from '@/components/BottomNav';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { SHOP_PARAMS, parseFilterId } from '@/common/routes';

const Index = () => {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const { isCartOpen, closeCart, itemCount } = useCart();
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  // Facet filters live in the URL so landing-page cards, the filter strip and a
  // refresh/shared link all resolve to the same state.
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = parseFilterId(searchParams.get(SHOP_PARAMS.CATEGORY));
  const brandId = parseFilterId(searchParams.get(SHOP_PARAMS.BRAND));

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filters: ProductFilters = useMemo(
    () => ({ categoryId, brandId, search }),
    [categoryId, brandId, search],
  );

  const setFilterParam = useCallback(
    (key: string, value: number | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value == null) next.delete(key);
          else next.set(key, String(value));
          return next;
        },
        // Replace so Back returns to the landing page, not through every filter.
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleCategoryChange = (id: number | null) => setFilterParam(SHOP_PARAMS.CATEGORY, id);
  const handleBrandChange = (id: number | null) => setFilterParam(SHOP_PARAMS.BRAND, id);
  const handleSearchChange = (value: string) => setSearch(value);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryId, brandId]);

  // Debounce search → reset page
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizing, dir]);

  const { categories, loading: categoriesLoading } = useCategories();
  const { brands, loading: brandsLoading } = useBrands();

  const { products, loading, error, totalCount, totalPages } = useProducts({
    page: currentPage,
    pageSize: 50,
    search: debouncedSearch,
    categoryId,
    brandId,
  });

  const filteredProducts = products;

  const greeting = user?.customerName
    ? `${t('hello') || 'Bonjour'}, ${user.customerName.split(' ')[0]}! 👋`
    : `${t('hello') || 'Bonjour'} 👋`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
      dir={dir}
    >
      <Header />

      <div className="flex" style={{ minHeight: 'calc(100vh - 3.75rem)' }}>
        {/* ── Desktop Cart Panel ── */}
        <aside
          className="hidden lg:flex flex-column"
          style={{
            width: `${sidebarWidth}px`,
            position: 'sticky',
            top: '3.75rem',
            height: 'calc(100vh - 3.75rem)',
            flexShrink: 0,
            background: 'white',
            borderInlineEnd: '1px solid #e5e7eb',
            boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
          }}
        >
          <CartDrawer isOpen={true} onClose={() => {}} isPanelMode={true} />
          <div
            onMouseDown={startResizing}
            style={{
              position: 'absolute',
              [dir === 'rtl' ? 'left' : 'right']: 0,
              top: 0,
              bottom: 0,
              width: '6px',
              cursor: 'col-resize',
              zIndex: 50,
              background: isResizing ? 'rgba(5,150,105,0.12)' : 'transparent',
              transition: 'background 0.2s',
            }}
          />
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 flex flex-column" style={{ minWidth: 0, overflow: 'hidden' }}>
          {/* Greeting strip — visible on mobile only */}
          <div
            className="lg:hidden"
            style={{
              background: 'linear-gradient(135deg, #047857 0%, #059669 60%, #10b981 100%)',
              padding: '0.75rem 1.25rem 1.75rem',
              flexShrink: 0,
            }}
          >
            <p
              style={{
                margin: '0 0 0.75rem',
                fontWeight: 900,
                fontSize: '1.4rem',
                color: 'white',
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
              }}
            >
              {greeting}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {itemCount > 0 && (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '999px',
                    padding: '0.3rem 0.75rem',
                  }}
                >
                  🛒 {itemCount}
                </span>
              )}
              <span
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(4px)',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '999px',
                  padding: '0.3rem 0.75rem',
                }}
              >
                {t('chooseProducts') || '🛍️ Commandez maintenant'}
              </span>
            </div>
          </div>

          {/* Search strip — white card lifts over gradient on mobile */}
          <div
            className="cl-search-strip"
            style={{
              background: 'white',
              borderBottom: '1px solid #f3f4f6',
              padding: '0.75rem 1rem',
              flexShrink: 0,
              borderRadius: '18px 18px 0 0',
              position: 'relative',
              zIndex: 1,
              marginTop: '-1.25rem',
            }}
          >
            <SearchBar value={search} onChange={handleSearchChange} />
          </div>

          {/* Brand + category filter strips */}
          <div className="cl-filter-panel">
            <FilterTiles
              title={t('brands')}
              allLabel={t('allBrands')}
              options={brands.map((b) => ({ id: b.id, label: b.name, imageUrl: b.logoUrl }))}
              activeId={brandId}
              onChange={handleBrandChange}
              icon={Tag}
              altTemplate={t('brandImageOf')}
              loading={brandsLoading}
            />
            <FilterTiles
              title={t('categories')}
              allLabel={t('allCategories')}
              options={categories.map((c) => ({
                id: c.id,
                label: c.name,
                imageUrl: c.imageUrl,
              }))}
              activeId={categoryId}
              onChange={handleCategoryChange}
              icon={Package}
              altTemplate={t('categoryImageOf')}
              loading={categoriesLoading}
            />
          </div>

          {/* Product area */}
          <div className="flex-1 overflow-y-auto cl-pb-nav" style={{ padding: '0.875rem 1rem' }}>
            {loading && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4rem 0',
                  gap: '1rem',
                }}
              >
                <ProgressSpinner style={{ width: '2rem', height: '2rem' }} strokeWidth="4" />
                <p style={{ color: '#6b7280', margin: 0 }}>{t('loading')}</p>
              </div>
            )}

            {error && !loading && (
              <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    color: '#059669',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                  }}
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
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </main>
      </div>

      {/* ── Mobile Cart Drawer ── */}
      <div className="lg:hidden">
        <CartDrawer isOpen={isCartOpen} onClose={closeCart} isPanelMode={false} />
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <BottomNav />
    </div>
  );
};

export default Index;
