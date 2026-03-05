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

export const ProductCard = ({ product, viewMode = 'grid' }: ProductCardProps) => {
  const { language, t, dir } = useLanguage();
  const { addItem, removeItem, getItemQuantity, updateQuantity } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);


  const getImageUrl = (imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;
    // Full URL (MinIO or any absolute URL): use directly
    if (imageUrl.startsWith('http')) return imageUrl;
    // Legacy fallback: construct from MinIO public URL
    const minioPublicUrl = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
    return `${minioPublicUrl}/orderium-media/${imageUrl}`;
  };

  const quantity = getItemQuantity(product.id);
  const displayName = product.name;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setIsModalOpen(true);
  };

  // List view layout
  if (viewMode === 'list') {
    return (
      <>
        <ProductQuantityModal
          product={product}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialQuantity={quantity}
        />

        <div
          onClick={handleCardClick}
          className={`surface-card border-round-lg overflow-hidden shadow-1 flex gap-2 p-2 cursor-pointer ${quantity > 0 ? 'border-2 border-primary' : ''}`}
          style={{ transition: 'box-shadow 0.3s', ...(quantity > 0 ? { background: 'rgba(var(--primary-color-rgb, 16,185,129), 0.05)' } : {}) }}
          dir={dir}
        >
          {/* Image */}
          <div className="relative flex-shrink-0 border-round-lg overflow-hidden" style={{ width: '4rem', height: '4rem', background: '#f3f4f6' }}>
            {product.imageUrl ? (
              <img
                src={getImageUrl(product.imageUrl)}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.5s' }}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex align-items-center justify-content-center" style={{ background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)' }}>
                <Package style={{ width: '1rem', height: '1rem', color: '#d1d5db' }} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-column justify-content-between" style={{ minWidth: 0 }}>
            <div>
              <h3 className="font-semibold text-color line-clamp-2 text-sm mb-1" style={{ lineHeight: '1.25' }}>
                {displayName}
              </h3>
              <div className="flex align-items-center gap-2">
                <p className="text-sm font-bold text-primary m-0">
                  {formatCurrency(product.price ?? 0, language)}
                </p>
                {quantity > 0 && (
                  <span className="border-circle text-xs font-semibold text-white flex align-items-center justify-content-center" style={{ background: 'var(--primary-color)', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.375rem' }}>
                    {quantity}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Grid view layout
  return (
    <>
      <ProductQuantityModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialQuantity={quantity}
      />

      <div
        onClick={handleCardClick}
        className={`relative surface-card border-round-lg overflow-hidden shadow-1 flex flex-column cursor-pointer ${quantity > 0 ? 'border-2 border-primary' : ''}`}
        style={{ transition: 'box-shadow 0.3s', ...(quantity > 0 ? { background: 'rgba(var(--primary-color-rgb, 16,185,129), 0.05)' } : {}) }}
        dir={dir}
      >
        {/* Image */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '4/3', background: '#f3f4f6' }}>
          {product.imageUrl ? (
            <img
              src={getImageUrl(product.imageUrl)}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.5s' }}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex align-items-center justify-content-center" style={{ background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)' }}>
              <Package style={{ width: '2rem', height: '2rem', color: '#d1d5db' }} />
            </div>
          )}

          {/* Quantity badge */}
          {quantity > 0 && (
            <div
              className="absolute border-circle text-white font-bold flex align-items-center justify-content-center shadow-2"
              style={{ top: '0.25rem', [dir === 'rtl' ? 'left' : 'right']: '0.25rem', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', fontSize: '0.625rem', background: 'var(--primary-color)' }}
            >
              {quantity}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-column p-2">
          <h3 className="font-medium text-color line-clamp-2 mb-1" style={{ fontSize: '0.6875rem', lineHeight: '1.25' }}>
            {displayName}
          </h3>

          <div className="mt-auto">
            <span className="font-bold text-primary" style={{ fontSize: '0.6875rem' }}>
              {formatCurrency(product.price ?? 0, language)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
