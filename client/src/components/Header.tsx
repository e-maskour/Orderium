import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { LanguageToggle } from './LanguageToggle';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onCartClick: () => void;
}

export const Header = ({ onCartClick }: HeaderProps) => {
  const { t, dir } = useLanguage();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-md border-b border-border shadow-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
            <span className="text-primary-foreground font-bold text-lg">م</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden sm:block">
            {t('appName')}
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onCartClick}
            className="relative"
            aria-label={t('cart')}
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -end-1 min-w-[20px] h-5 px-1.5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};
