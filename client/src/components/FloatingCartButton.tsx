import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingCartButtonProps {
  onClick: () => void;
}

export const FloatingCartButton = ({ onClick }: FloatingCartButtonProps) => {
  const { language, t, dir } = useLanguage();
  const { itemCount, subtotal } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 start-4 end-4 z-30 md:hidden" dir={dir}>
      <Button
        variant="cart"
        size="touchLg"
        className="w-full shadow-medium"
        onClick={onClick}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="relative">
              <ShoppingBag className="w-6 h-6" />
              <span className="absolute -top-2 -end-2 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            </div>
            <span>{t('cart')}</span>
          </div>
          <span className="font-bold">{formatCurrency(subtotal, language)}</span>
        </div>
      </Button>
    </div>
  );
};
