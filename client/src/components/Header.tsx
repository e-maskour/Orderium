import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { LanguageToggle } from './LanguageToggle';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onCartClick: () => void;
}

export const Header = ({ onCartClick }: HeaderProps) => {
  const { t, dir } = useLanguage();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all flex-shrink-0">
            <span className="text-white font-bold text-lg sm:text-xl">O</span>
          </div>
          <span className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:block truncate">
            {t('appName')}
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <LanguageToggle />
          
          {/* Mobile Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCartClick}
            className="relative lg:hidden hover:bg-gray-100 h-10 w-10 sm:h-11 sm:w-11"
            aria-label={t('cart')}
          >
            <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 px-1 sm:px-1.5 bg-primary text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};
