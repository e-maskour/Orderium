import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { ProductFilters, ProductCategory } from '@/types/database';
import { useProducts } from "@/hooks/useProducts";
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { CategoryChips } from '@/components/CategoryChips';
import { ProductGrid } from '@/components/ProductGrid';
import { CartDrawer } from '@/components/CartDrawer';
import { FloatingCartButton } from '@/components/FloatingCartButton';

const Index = () => {
  const { t, dir } = useLanguage();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({
    category: 'all',
    search: '',
  });

  const handleCategoryChange = (category: ProductCategory) => {
    setFilters((prev) => ({ ...prev, category }));
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  };

  const { products, loading, error } = useProducts();
  
  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <Header onCartClick={() => setIsCartOpen(true)} />

      {/* Hero section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary to-background py-8 md:py-12">
        <div className="absolute inset-0 moroccan-pattern opacity-30" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 animate-fade-in">
              {t('tagline')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
              {dir === 'rtl' 
                ? 'اكتشف أشهى الأطباق المغربية التقليدية'
                : 'Découvrez les meilleurs plats marocains traditionnels'
              }
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto animate-slide-up" style={{ animationDelay: '200ms' }}>
            <SearchBar value={filters.search} onChange={handleSearchChange} />
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* Category chips */}
        <div className="mb-6">
          <CategoryChips
            activeCategory={filters.category}
            onCategoryChange={handleCategoryChange}
          />
        </div>

        {/* Product grid */}
        {loading && <p className="text-center">Loading products…</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {!loading && !error && (
          <ProductGrid products={products} filters={filters} />
        )}

      </main>

      {/* Cart drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Floating cart button (mobile) */}
      <FloatingCartButton onClick={() => setIsCartOpen(true)} />
    </div>
  );
};

export default Index;
