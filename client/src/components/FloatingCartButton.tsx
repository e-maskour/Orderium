import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { ShoppingBag } from 'lucide-react';

interface FloatingCartButtonProps {
  onClick: () => void;
}

export const FloatingCartButton = ({ onClick }: FloatingCartButtonProps) => {
  const { language, t, dir } = useLanguage();
  const { items, itemCount } = useCart();

  const uniqueProductCount = items.length;

  if (itemCount === 0) return null;

  return (
    <div className="fixed z-5 hidden-lg" style={{ bottom: '1.5rem', insetInlineEnd: '1.5rem' }} dir={dir}>
      <Button
        onClick={onClick}
        rounded
        raised
        className="shadow-4 p-overlay-badge"
        style={{ width: '3.5rem', height: '3.5rem' }}
        aria-label={t('cart') || 'Cart'}
      >
        <ShoppingBag style={{ width: '1.5rem', height: '1.5rem' }} />
        <Badge value={uniqueProductCount.toString()} severity="danger" />
      </Button>
    </div>
  );
};
