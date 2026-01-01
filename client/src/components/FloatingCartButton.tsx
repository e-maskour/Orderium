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
  const { items, itemCount, subtotal } = useCart();
  
  const uniqueProductCount = items.length;

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 end-4 sm:end-6 z-30 lg:hidden" dir={dir}>
      <Button
        onClick={onClick}
        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-100 relative"
      >
        <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="absolute -top-1 -end-1 min-w-[20px] h-5 sm:min-w-[24px] sm:h-6 px-1 sm:px-1.5 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
          {uniqueProductCount}
        </span>
      </Button>
    </div>
  );
};
