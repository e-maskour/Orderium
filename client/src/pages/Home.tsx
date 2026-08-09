import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useBrands } from '@/hooks/useBrands';
import { useCategories } from '@/hooks/useCategories';
import { useTopSellers, useNewestProducts, useReorderProducts } from '@/hooks/useProductRails';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CartDrawer } from '@/components/CartDrawer';
import { DiscoveryBand } from '@/components/DiscoveryBand';
import { ProductRail } from '@/components/ProductRail';
import { SHOP_PATH } from '@/common/routes';

const Home = () => {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const { isCartOpen, closeCart } = useCart();

  const { brands, loading: brandsLoading } = useBrands();
  const { categories, loading: categoriesLoading } = useCategories();

  const reorder = useReorderProducts();
  const topSellers = useTopSellers();
  const newest = useNewestProducts();

  const firstName = user?.customerName?.split(' ')[0];
  const greeting = firstName ? `${t('hello')}, ${firstName}` : t('hello');

  return (
    <div className="cl-home" dir={dir}>
      <Header />

      <main className="cl-home-main cl-pb-nav">
        <div className="cl-hero">
          <div className="cl-hero-copy">
            <p className="cl-hero-greeting">{greeting}</p>
            <h1 className="cl-hero-title">{t('heroTitle')}</h1>
            <p className="cl-hero-sub">{t('browseSubtitle')}</p>
            <Link to={SHOP_PATH} className="cl-hero-cta">
              <span>{t('seeAllProducts')}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <DiscoveryBand
          brands={brands.map((b) => ({ id: b.id, name: b.name, imageUrl: b.logoUrl }))}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            imageUrl: c.imageUrl,
          }))}
          loading={brandsLoading || categoriesLoading}
        />

        <ProductRail
          eyebrow={t('reorderEyebrow')}
          title={t('reorderTitle')}
          subtitle={t('reorderSubtitle')}
          products={reorder.products}
          loading={reorder.loading}
          seeAllHref="/my-orders"
        />

        <ProductRail
          eyebrow={t('topSellersEyebrow')}
          title={t('topSellersTitle')}
          subtitle={t('topSellersSubtitle')}
          products={topSellers.products}
          loading={topSellers.loading}
          seeAllHref={SHOP_PATH}
          ranked
        />

        <ProductRail
          eyebrow={t('newArrivalsEyebrow')}
          title={t('newArrivalsTitle')}
          subtitle={t('newArrivalsSubtitle')}
          products={newest.products}
          loading={newest.loading}
          seeAllHref={SHOP_PATH}
        />
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
      <BottomNav />
    </div>
  );
};

export default Home;
