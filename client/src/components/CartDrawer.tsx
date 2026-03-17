import { useLanguage } from '@/context/LanguageContext';
import { useCart, CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { Sidebar } from 'primereact/sidebar';
import { ShoppingBag, Trash2, ArrowRight, ArrowLeft, Package, Minus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ProductQuantityModal } from './ProductQuantityModal';
import { Product } from '@/types/database';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isPanelMode?: boolean;
}

const getImageUrl = (imageUrl?: string): string | undefined => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl;
  const minioPublicUrl = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
  return `${minioPublicUrl}/orderium-media/${imageUrl}`;
};

const CartItemRow = ({ item, onItemClick }: { item: CartItem; onItemClick: (item: CartItem) => void }) => {
  const { t } = useLanguage();
  const { removeItem, updateQuantity } = useCart();
  const displayName = item.product.name;

  return (
    <div style={{ padding: '0.4rem 0.75rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.625rem',
          padding: '0.5rem 0.625rem',
          alignItems: 'center',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #f0f0f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left accent stripe */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#059669', borderRadius: '12px 0 0 12px' }} />
        <div style={{ width: '3px', flexShrink: 0 }} />{/* spacer for stripe */}
      {/* Thumbnail */}
      <div
        onClick={() => onItemClick(item)}
        style={{
          flexShrink: 0, width: '3rem', height: '3rem',
          borderRadius: '0.625rem', overflow: 'hidden',
          background: '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {item.product.imageUrl ? (
          <img src={getImageUrl(item.product.imageUrl)} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <Package size={18} color="#d1d5db" />
        )}
      </div>

      {/* Info + controls */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.25rem' }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.8rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {displayName}
          </p>
          <button
            onClick={() => removeItem(item.product.id)}
            aria-label={t('removeFromCart')}
            style={{
              flexShrink: 0, width: '1.625rem', height: '1.625rem', borderRadius: '50%',
              border: 'none', background: '#fee2e2', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <Trash2 size={11} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
          {/* Qty stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <button
              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
              style={{
                width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                border: '1.5px solid #e5e7eb', background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#374151',
              }}
            >
              <Minus size={10} />
            </button>
            <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#059669', minWidth: '1.25rem', textAlign: 'center' }}>
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
              style={{
                width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                border: 'none', background: '#059669',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white',
              }}
            >
              <Plus size={10} />
            </button>
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a' }}>
            {formatCurrency(item.product.price * item.quantity, 'fr')}
          </span>
        </div>
      </div>
    </div>
    </div>
  );
};

export const CartDrawer = ({ isOpen, onClose, isPanelMode = false }: CartDrawerProps) => {
  const { language, t, dir } = useLanguage();
  const { items, subtotal, itemCount, clearCart, closeCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [initialQuantity, setInitialQuantity] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const uniqueProductCount = items.length;

  const handleItemClick = (item: CartItem) => {
    setSelectedProduct(item.product);
    setInitialQuantity(item.quantity);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    onClose();
    closeCart();
  };

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const cartContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} dir={dir}>
      {/* Panel header — desktop only */}
      {isPanelMode && (
        <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '1rem 1.25rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag size={18} color="white" />
              <h2 style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '1rem' }}>
                {t('yourCart')}
              </h2>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                aria-label={t('clearCart')}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '0.5rem', cursor: 'pointer', color: 'white',
                  width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
          {itemCount > 0 && (
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
              {uniqueProductCount} {t(uniqueProductCount === 1 ? 'cartProduct' : 'cartProducts')} · {itemCount} {t(itemCount === 1 ? 'piece' : 'pieces')}
            </p>
          )}
        </div>
      )}

      {/* Items list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <ShoppingBag size={28} color="#d1d5db" />
            </div>
            <h3 style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem', fontSize: '1.0625rem' }}>{t('emptyCart')}</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>{t('emptyCartMessage')}</p>
            {!isPanelMode && (
              <button
                onClick={handleClose}
                style={{
                  padding: '0.75rem 2rem', borderRadius: '0.875rem', border: 'none',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: 'white', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer',
                }}
              >
                {t('continueShopping')}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', padding: '0.375rem 0' }}>
            {items.map(item => (
              <CartItemRow key={item.product.id} item={item} onItemClick={handleItemClick} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div style={{ flexShrink: 0, background: 'white', padding: '1rem 1.25rem', borderTop: '1px solid #f3f4f6' }}>
          {/* Subtotal row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '0.875rem' }}>
            <span style={{ color: '#374151', fontWeight: 600, fontSize: '0.9375rem' }}>{t('totalAmount')}</span>
            <span style={{ fontWeight: 900, fontSize: '1.5rem', color: '#059669', letterSpacing: '-0.02em' }}>
              {formatCurrency(subtotal, language)}
            </span>
          </div>
          <Link to="/checkout" onClick={isPanelMode ? undefined : handleClose} style={{ textDecoration: 'none', display: 'block' }}>
            <button style={{
              width: '100%', padding: '1rem', border: 'none',
              borderRadius: '0.875rem',
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: 'white', fontWeight: 800, fontSize: '1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 4px 16px rgba(5,150,105,0.4)',
              letterSpacing: '0.01em',
            }}>
              {t('checkout')}
              <ArrowIcon size={18} />
            </button>
          </Link>
        </div>
      )}
    </div>
  );

  // Panel Mode (Desktop — always visible)
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

  // Drawer Mode (Mobile — PrimeReact Sidebar)
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
        onHide={handleClose}
        position={dir === 'rtl' ? 'left' : 'right'}
        modal
        header={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }} dir={dir}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
              <ShoppingBag size={18} color="#059669" />
              {t('yourCart')}
              {itemCount > 0 && (
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#059669', background: '#d1fae5', borderRadius: '9999px', padding: '0.125rem 0.5rem' }}>
                  {itemCount}
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        }
        style={{ width: '100%', maxWidth: '28rem' }}
        pt={{ content: { style: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } } }}
      >
        {cartContent}
      </Sidebar>
    </>
  );
};

