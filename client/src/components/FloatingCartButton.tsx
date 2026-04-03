import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { ShoppingBag } from 'lucide-react';

interface FloatingCartButtonProps {
  onClick: () => void;
}

export const FloatingCartButton = ({ onClick }: FloatingCartButtonProps) => {
  const { language, t, dir } = useLanguage();
  const { items, itemCount } = useCart();

  const uniqueProductCount = items.length;

  // Hidden on desktop (lg+) via CSS; shown on mobile
  if (itemCount === 0) return null;

  return (
    <div
      className="lg:hidden"
      style={{ position: 'fixed', bottom: '5rem', insetInlineEnd: '1rem', zIndex: 45 }}
      dir={dir}
    >
      <button
        onClick={onClick}
        className="cl-bottom-cart-btn"
        aria-label={t('cart') || 'Cart'}
        style={{
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '50%',
          position: 'relative',
          boxShadow: '0 6px 20px rgba(5,150,105,0.45)',
        }}
      >
        <ShoppingBag style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
        <span className="cl-bottom-cart-badge">{uniqueProductCount}</span>
      </button>
    </div>
  );
};
