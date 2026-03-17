import { useLanguage } from '@/context/LanguageContext';
import { useCart, CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { Sidebar } from 'primereact/sidebar';
import { ShoppingBag, Trash2, ArrowRight, ArrowLeft, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ProductQuantityModal } from './ProductQuantityModal';
import { Product } from '@/types/database';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isPanelMode?: boolean;
}

// Resolve an image URL.  MinIO provider stores full public URLs; this function
// also handles legacy relative paths stored before the MinIO migration.
const getImageUrl = (imageUrl?: string): string | undefined => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl;
  const minioPublicUrl = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
  return `${minioPublicUrl}/orderium-media/${imageUrl}`;
};

const CartItemRow = ({ item, onItemClick }: { item: CartItem; onItemClick: (item: CartItem) => void }) => {
  const { t } = useLanguage();
  const { removeItem } = useCart();
  const displayName = item.product.name;

  return (
    <div
      onClick={() => onItemClick(item)}
      style={{
        display: 'flex', gap: '0.75rem', padding: '0.75rem',
        borderBottom: '1px solid var(--surface-border)',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-50)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Thumbnail */}
      <div style={{
        flexShrink: 0, width: '3.5rem', height: '3.5rem',
        borderRadius: '0.625rem', overflow: 'hidden',
        background: 'var(--surface-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.product.imageUrl ? (
          <img src={getImageUrl(item.product.imageUrl)} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <Package style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-color-secondary)', opacity: 0.4 }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.25rem' }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {displayName}
          </p>
          <button
            onClick={e => { e.stopPropagation(); removeItem(item.product.id); }}
            aria-label={t('removeFromCart')}
            style={{
              flexShrink: 0, width: '1.75rem', height: '1.75rem', borderRadius: '50%',
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ef4444', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{
              minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem',
              borderRadius: '0.625rem', background: 'var(--primary-color)',
              color: 'white', fontSize: '0.7rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.quantity}
            </span>
            × {formatCurrency(item.product.price, 'fr')}
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-color)' }}>
            {formatCurrency(item.product.price * item.quantity, 'fr')}
          </span>
        </div>
      </div>
    </div>
  );
};

export const CartDrawer = ({ isOpen, onClose, isPanelMode = false }: CartDrawerProps) => {
  const { language, t, dir } = useLanguage();
  const { items, subtotal, itemCount, clearCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [initialQuantity, setInitialQuantity] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const uniqueProductCount = items.length;

  const handleItemClick = (item: CartItem) => {
    setSelectedProduct(item.product);
    setInitialQuantity(item.quantity);
    setIsModalOpen(true);
  };

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const cartContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} dir={dir}>
      {/* Panel header (desktop sidebar only) */}
      {isPanelMode && (
        <div style={{ background: 'linear-gradient(135deg, #1e1e2d, #16213e)', padding: '1rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag style={{ width: '1.125rem', height: '1.125rem', color: '#34d399' }} />
              {t('yourCart')}
            </h2>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                aria-label={t('clearCart')}
                title={t('clearCart')}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '0.5rem', cursor: 'pointer', color: '#f87171',
                  width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
              >
                <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
              </button>
            )}
          </div>
          {itemCount > 0 && (
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
              {uniqueProductCount} {t(uniqueProductCount === 1 ? 'cartProduct' : 'cartProducts')} · {itemCount} {t(itemCount === 1 ? 'piece' : 'pieces')}
            </p>
          )}
        </div>
      )}

      {/* Items list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div className="cl-empty" style={{ height: '100%' }}>
            <div className="cl-empty-icon">
              <ShoppingBag style={{ width: '2rem', height: '2rem', color: '#d1d5db' }} />
            </div>
            <h3 style={{ fontWeight: 600, color: 'var(--text-color)', margin: '0 0 0.5rem' }}>{t('emptyCart')}</h3>
            <p style={{ color: 'var(--text-color-secondary)', fontSize: '0.875rem', margin: 0 }}>{t('emptyCartMessage')}</p>
            {!isPanelMode && (
              <button onClick={onClose} className="cl-btn-primary" style={{ marginTop: '1.25rem', padding: '0.75rem 2rem' }}>
                {t('continueShopping')}
              </button>
            )}
          </div>
        ) : (
          <div>
            {items.map(item => (
              <CartItemRow key={item.product.id} item={item} onItemClick={handleItemClick} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--surface-border)', padding: '1rem', background: 'var(--surface-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <span style={{ color: 'var(--text-color-secondary)', fontWeight: 500 }}>{t('totalAmount')}</span>
            <span style={{ fontWeight: 800, fontSize: '1.375rem', color: 'var(--primary-color)' }}>
              {formatCurrency(subtotal, language)}
            </span>
          </div>
          <Link to="/checkout" onClick={isPanelMode ? undefined : onClose} style={{ textDecoration: 'none', display: 'block' }}>
            <button className="cl-btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {t('checkout')}
              <ArrowIcon style={{ width: '1.125rem', height: '1.125rem' }} />
            </button>
          </Link>
        </div>
      )}
    </div>
  );

  // Panel Mode (Desktop - always visible)
  if (isPanelMode) {
    return (
      <>
        <ProductQuantityModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialQuantity={initialQuantity}
        />
        {cartContent}
      </>
    );
  }

  // Drawer Mode (Mobile) — PrimeReact Sidebar
  return (
    <>
      <ProductQuantityModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialQuantity={initialQuantity}
      />

      <Sidebar
        visible={isOpen}
        onHide={onClose}
        position={dir === 'rtl' ? 'left' : 'right'}
        modal
        header={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }} dir={dir}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-color)' }}>
              <ShoppingBag style={{ width: '1.125rem', height: '1.125rem', color: 'var(--primary-color)' }} />
              {t('yourCart')}
              {itemCount > 0 && (
                <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
                  ({uniqueProductCount} {t(uniqueProductCount === 1 ? 'cartProduct' : 'cartProducts')} · {itemCount} {t(itemCount === 1 ? 'piece' : 'pieces')})
                </span>
              )}
            </span>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                aria-label={t('clearCart')}
                style={{
                  background: '#fee2e2', border: 'none', borderRadius: '50%',
                  width: '2rem', height: '2rem', cursor: 'pointer', color: '#ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
              </button>
            )}
          </div>
        }
        style={{ width: '100%', maxWidth: '28rem' }}
        contentStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {cartContent}
      </Sidebar>
    </>
  );
};
