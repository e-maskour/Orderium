import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { interpolate } from '@/lib/i18n';
import type { Product } from '@/types/database';
import { ProductCard } from './ProductCard';

interface ProductRailProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  products: Product[];
  loading: boolean;
  /** Where "see all" leads — each rail has a different natural continuation. */
  seeAllHref: string;
  /**
   * Draw the rank on each card. Only true for best sellers, where the position
   * is the content: #1 genuinely outsells #3.
   */
  ranked?: boolean;
}

export const ProductRail = ({
  eyebrow,
  title,
  subtitle,
  products,
  loading,
  seeAllHref,
  ranked = false,
}: ProductRailProps) => {
  const { t } = useLanguage();

  // A rail with nothing in it is dropped, not shown as an empty shelf.
  if (!loading && products.length === 0) return null;

  const headingId = `rail-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <section className="cl-rail" aria-labelledby={headingId}>
      <header className="cl-rail-head">
        <div className="cl-rail-heading">
          <p className="cl-eyebrow">{eyebrow}</p>
          <h2 className="cl-rail-title" id={headingId}>
            {title}
          </h2>
          <p className="cl-rail-subtitle">{subtitle}</p>
        </div>
        <Link to={seeAllHref} className="cl-rail-link">
          <span>{t('seeAll')}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      <div className="cl-rail-grid">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="cl-rail-slot" aria-hidden="true">
                <div className="cl-rail-skeleton">
                  <div className="cl-skeleton cl-rail-skeleton-media" />
                  <div className="cl-skeleton cl-rail-skeleton-line" />
                  <div className="cl-skeleton cl-rail-skeleton-line short" />
                </div>
              </div>
            ))
          : products.map((product, index) => (
              <div className="cl-rail-slot" key={product.id}>
                {ranked && (
                  <span
                    className="cl-rank"
                    aria-label={interpolate(t('rankLabel'), { rank: index + 1 })}
                  >
                    {index + 1}
                  </span>
                )}
                <ProductCard product={product} index={index} />
              </div>
            ))}
      </div>
    </section>
  );
};
