import { useLanguage } from '@/context/LanguageContext';
import { useCart, CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { Button } from 'primereact/button';
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

// Get API base URL from environment or use window origin
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const s3BaseUrl = import.meta.env.VITE_S3_BASE_URL || '';
const cloudflareBaseUrl = import.meta.env.VITE_CLOUDFLARE_BASE_URL || '';

// Helper to convert relative image paths to full URLs - supports multiple CDN providers
const getImageUrl = (imageUrl?: string): string | undefined => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('orderium/')) {
    return `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/${imageUrl}`;
  }
  if (imageUrl.startsWith('s3://')) {
    return `${s3BaseUrl}/${imageUrl.replace('s3://', '')}`;
  }
  if (imageUrl.startsWith('cf://')) {
    return `${cloudflareBaseUrl}/${imageUrl.replace('cf://', '')}`;
  }
  return `${apiBaseUrl}/uploads/images/${imageUrl}`;
};

const CartItemRow = ({ item, onItemClick }: { item: CartItem; onItemClick: (item: CartItem) => void }) => {
  const { language, dir, t } = useLanguage();
  const { removeItem } = useCart();

  const displayName = item.product.name;

  return (
    <div
      onClick={() => onItemClick(item)}
      className="flex gap-2 py-2 cursor-pointer border-bottom-1 surface-border"
      style={{ borderRadius: '6px', padding: '0.5rem' }}
      dir={dir}
    >
      {/* Image */}
      <div
        className="flex-shrink-0 border-round overflow-hidden flex align-items-center justify-content-center"
        style={{ width: '3rem', height: '3rem', background: '#f3f4f6' }}
      >
        {item.product.imageUrl ? (
          <img
            src={getImageUrl(item.product.imageUrl)}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <Package style={{ width: '1rem', height: '1rem', color: '#d1d5db' }} />
        )}
      </div>

      {/* Details */}
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div className="flex align-items-start justify-content-between mb-1">
          <h4 className="font-medium line-clamp-1" style={{ color: '#111827', fontSize: '0.875rem', lineHeight: '1.25' }}>
            {displayName}
          </h4>
          <Button
            text
            rounded
            severity="danger"
            icon={<Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />}
            onClick={(e) => {
              e.stopPropagation();
              removeItem(item.product.id);
            }}
            aria-label={t('removeFromCart')}
            className="flex-shrink-0"
            style={{ width: '1.5rem', height: '1.5rem', padding: 0 }}
          />
        </div>

        <div className="flex align-items-center justify-content-between">
          <p className="flex align-items-center gap-1" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {formatCurrency(item.product.price, language)} ×
            <span
              className="inline-flex align-items-center justify-content-center border-circle font-bold text-white"
              style={{ minWidth: '18px', height: '18px', padding: '0 4px', fontSize: '9px', background: 'var(--primary-color)' }}
            >
              {item.quantity}
            </span>
          </p>

          <span className="font-bold" style={{ color: '#111827', fontSize: '0.875rem' }}>
            {formatCurrency(item.product.price * item.quantity, language)}
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
    <div className="flex flex-column h-full" dir={dir}>
      {/* Header (only for panel mode — Sidebar has its own header) */}
      {isPanelMode && (
        <div className="p-3 border-bottom-1 surface-border">
          <div className="flex align-items-center justify-content-between mb-1">
            <h2 className="text-lg font-bold flex align-items-center gap-2" style={{ color: '#111827' }}>
              <ShoppingBag style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary-color)' }} />
              {t('yourCart')}
            </h2>
            {items.length > 0 && (
              <Button
                text
                rounded
                severity="danger"
                icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />}
                onClick={clearCart}
                style={{ width: '2rem', height: '2rem', padding: 0 }}
              />
            )}
          </div>
          {itemCount > 0 && (
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {uniqueProductCount} {uniqueProductCount === 1 ? t('cartProduct') : t('cartProducts')} - {itemCount} {itemCount === 1 ? t('piece') : t('pieces')}
            </p>
          )}
        </div>
      )}

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-3" dir={dir}>
        {items.length === 0 ? (
          <div className="flex flex-column align-items-center justify-content-center h-full py-6 text-center">
            <div
              className="border-circle flex align-items-center justify-content-center mb-3"
              style={{ width: '5rem', height: '5rem', background: '#f3f4f6' }}
            >
              <ShoppingBag style={{ width: '2.5rem', height: '2.5rem', color: '#d1d5db' }} />
            </div>
            <h3 className="font-semibold mb-2" style={{ color: '#111827', fontSize: '1rem' }}>
              {t('emptyCart')}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {t('emptyCartMessage')}
            </p>
            {!isPanelMode && (
              <Button
                label={t('continueShopping')}
                outlined
                onClick={onClose}
                className="mt-4"
                style={{ height: '2.75rem', padding: '0 1.5rem' }}
              />
            )}
          </div>
        ) : (
          <div className="py-2">
            {items.map((item) => (
              <CartItemRow key={item.product.id} item={item} onItemClick={handleItemClick} />
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {items.length > 0 && (
        <div className="border-top-1 surface-border p-3" style={{ background: '#f9fafb' }} dir={dir}>
          <div className="flex align-items-center justify-content-between mb-2">
            <span className="font-semibold" style={{ color: '#111827' }}>{t('totalAmount')}</span>
            <span className="font-bold" style={{ fontSize: '1.25rem', color: 'var(--primary-color)' }}>
              {formatCurrency(subtotal, language)}
            </span>
          </div>

          <Link to="/checkout" onClick={isPanelMode ? undefined : onClose} style={{ textDecoration: 'none' }}>
            <Button
              label={t('checkout')}
              icon={<ArrowIcon style={{ width: '1.25rem', height: '1.25rem' }} />}
              iconPos="right"
              className="w-full font-semibold"
              style={{ height: '2.75rem' }}
            />
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
          <div className="flex align-items-center justify-content-between w-full" dir={dir}>
            <span className="flex align-items-center gap-2 font-bold text-lg" style={{ color: '#111827' }}>
              <ShoppingBag style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary-color)' }} />
              {t('yourCart')}
              {itemCount > 0 && (
                <span className="font-normal" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  ({uniqueProductCount} {uniqueProductCount === 1 ? t('cartProduct') : t('cartProducts')} - {itemCount} {itemCount === 1 ? t('piece') : t('pieces')})
                </span>
              )}
            </span>
            {items.length > 0 && (
              <Button
                text
                rounded
                severity="danger"
                icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />}
                onClick={clearCart}
                style={{ width: '2rem', height: '2rem', padding: 0 }}
              />
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
