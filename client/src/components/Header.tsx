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
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
            <span className="text-white font-bold text-xl">O</span>
          </div>
          <span className="text-xl font-bold text-gray-900 hidden sm:block">
            {t('appName')}
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <LanguageToggle />
          
          {/* Desktop Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCartClick}
            className="relative lg:hidden hover:bg-gray-100"
            aria-label={t('cart')}
          >
            <ShoppingBag className="h-5 w-5 text-gray-700" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -end-1 min-w-[20px] h-5 px-1.5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};
