import { Product } from '@/types/database';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { Package } from 'lucide-react';
import { useState } from 'react';
import { ProductQuantityModal } from './ProductQuantityModal';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

const getImageUrl = (imageUrl?: string): string | undefined => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl;
  const base = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
  return `${base}/orderium-media/${imageUrl}`;
};

export const ProductCard = ({ product, viewMode = 'grid' }: ProductCardProps) => {
  const { language, dir } = useLanguage();
  const { getItemQuantity } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const quantity = getItemQuantity(product.id);
  const inCart = quantity > 0;

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsModalOpen(true);
  };

  /* ── LIST view ── */
  if (viewMode === 'list') {
    return (
      <>
        <ProductQuantityModal product={product} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialQuantity={quantity} />
        <div
          onClick={handleClick}
          className={`cl-product-card${inCart ? ' in-cart' : ''}`}
          style={{ flexDirection: 'row', alignItems: 'center', padding: '0.625rem' }}
          dir={dir}
        >
          <div style={{ width: '4rem', height: '4rem', borderRadius: '0.625rem', overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
            {product.imageUrl
              ? <img src={getImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package style={{ width: '1.25rem', height: '1.25rem', color: '#d1d5db' }} /></div>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0, padding: '0 0.625rem' }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.name}
            </p>
            <p style={{ margin: '0.125rem 0 0', fontWeight: 800, fontSize: '1rem', color: 'var(--primary-color)' }}>
              {formatCurrency(product.price ?? 0, language)}
            </p>
          </div>

          {inCart && (
            <div style={{
              minWidth: '2rem', height: '2rem', borderRadius: '9999px',
              background: 'var(--primary-color)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.8125rem', flexShrink: 0, padding: '0 0.375rem',
            }}>{quantity}</div>
          )}
        </div>
      </>
    );
  }

  /* ── GRID view ── */
  return (
    <>
      <ProductQuantityModal product={product} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialQuantity={quantity} />
      <div onClick={handleClick} className={`cl-product-card${inCart ? ' in-cart' : ''}`} dir={dir}>
        {/* Image */}
        <div style={{ aspectRatio: '4/3', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
          {product.imageUrl
            ? <img src={getImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.4s' }} loading="lazy" />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f3f4f6,#e9ecef)' }}><Package style={{ width: '2rem', height: '2rem', color: '#d1d5db' }} /></div>
          }
          {inCart && <div className="cl-qty-badge">{quantity}</div>}
        </div>

        {/* Info */}
        <div style={{ padding: '0.5rem 0.625rem 0.625rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <p style={{ margin: 0, fontWeight: 500, fontSize: '0.8125rem', color: 'var(--text-color)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {product.name}
          </p>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: 'var(--primary-color)', marginTop: 'auto' }}>
            {formatCurrency(product.price ?? 0, language)}
          </p>
        </div>
      </div>
    </>
  );
};
