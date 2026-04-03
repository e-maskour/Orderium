import { Product } from '@/types/database';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { Package, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import { ProductQuantityModal } from './ProductQuantityModal';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
  index?: number;
}

const getImageUrl = (imageUrl?: string): string | undefined => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl;
  const base = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
  return `${base}/orderium-media/${imageUrl}`;
};

export const ProductCard = ({ product, viewMode = 'grid', index = 99 }: ProductCardProps) => {
  const isAboveFold = index < 6;
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
        <ProductQuantityModal
          product={product}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialQuantity={quantity}
        />
        <div
          onClick={handleClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.625rem 0.75rem',
            background: '#ffffff',
            borderRadius: '0.875rem',
            border: inCart ? '1.5px solid #059669' : '1.5px solid #f3f4f6',
            boxShadow: inCart ? '0 0 0 3px rgba(5,150,105,0.08)' : '0 1px 4px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
          dir={dir}
        >
          {/* Image */}
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '0.625rem',
              overflow: 'hidden',
              background: '#f8fafc',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {product.imageUrl ? (
              <img
                src={getImageUrl(product.imageUrl)}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                loading={isAboveFold ? 'eager' : 'lazy'}
                fetchpriority={isAboveFold ? 'high' : 'auto'}
                decoding="async"
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                  }}
                >
                  {product.name?.charAt(0) || '?'}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: '0.825rem',
                color: '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {product.name}
            </p>
            <p
              style={{
                margin: '0.15rem 0 0',
                fontWeight: 800,
                fontSize: '0.9rem',
                color: '#059669',
              }}
            >
              {formatCurrency(product.price ?? 0, language)}
            </p>
          </div>

          {/* Qty badge / add button */}
          {inCart ? (
            <div
              style={{
                minWidth: '2.25rem',
                height: '2.25rem',
                borderRadius: '9999px',
                background: '#059669',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.875rem',
                flexShrink: 0,
                gap: '0.125rem',
                padding: '0 0.5rem',
              }}
            >
              <Check size={12} />
              {quantity}
            </div>
          ) : (
            <div
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '9999px',
                background: '#f0fdf4',
                border: '1.5px solid #059669',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Plus size={16} />
            </div>
          )}
        </div>
      </>
    );
  }

  /* ── GRID view ── */
  return (
    <>
      <ProductQuantityModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialQuantity={quantity}
      />
      <div
        onClick={handleClick}
        style={{
          background: '#ffffff',
          borderRadius: '0.875rem',
          border: inCart ? '1.5px solid #059669' : '1.5px solid #f0f0f0',
          boxShadow: inCart
            ? '0 0 0 3px rgba(5,150,105,0.10), 0 2px 8px rgba(0,0,0,0.05)'
            : '0 2px 8px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
          WebkitTapHighlightColor: 'transparent',
          position: 'relative',
        }}
        onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
        onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        dir={dir}
      >
        {/* Image area */}
        <div
          style={{
            aspectRatio: '1 / 1',
            background: '#f8fafc',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {product.imageUrl ? (
            <img
              src={getImageUrl(product.imageUrl)}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              loading={isAboveFold ? 'eager' : 'lazy'}
              fetchpriority={isAboveFold ? 'high' : 'auto'}
              decoding="async"
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f1f5f9',
                gap: '0.5rem',
              }}
            >
              <Package size={32} color="#94a3b8" strokeWidth={1.5} />
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  letterSpacing: '0.03em',
                  maxWidth: '80%',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {product.name}
              </span>
            </div>
          )}
          {/* Cart qty badge */}
          {inCart && (
            <div
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                minWidth: '1.625rem',
                height: '1.625rem',
                padding: '0 0.375rem',
                borderRadius: '9999px',
                background: '#059669',
                color: 'white',
                fontSize: '0.6875rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(5,150,105,0.4)',
              }}
            >
              {quantity}
            </div>
          )}
        </div>

        {/* Info */}
        <div
          style={{
            padding: '0.4rem 0.5rem',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.15rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: '0.75rem',
              color: '#0f172a',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {product.name}
          </p>
          <p
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: '0.875rem',
              color: '#059669',
              marginTop: 'auto',
              paddingTop: '0.15rem',
            }}
          >
            {formatCurrency(product.price ?? 0, language)}
          </p>
        </div>

        {/* Add/In-cart indicator strip at bottom */}
        <div
          style={{
            height: '3px',
            background: inCart ? '#059669' : 'transparent',
            transition: 'background 0.2s',
          }}
        />
      </div>
    </>
  );
};
