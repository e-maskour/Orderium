import { Product } from '@/types/database';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { productTranslations } from '@/data/mockProducts';
import { Button } from '@/components/ui/button';
import { Plus, Minus, ShoppingBag, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { language, t, dir } = useLanguage();
  const { addItem, removeItem, getItemQuantity, updateQuantity } = useCart();
  
  const quantity = getItemQuantity(product.Id);
  
  // Get translated name/description if available
  const translation = productTranslations[product.Id];
  const displayName = language === 'fr' && translation ? translation.name : product.Name;
  const displayDescription = language === 'fr' && translation ? translation.description : product.Description;

  const handleAddToCart = () => {
    addItem(product);
  };

  const handleIncrement = () => {
    updateQuantity(product.Id, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.Id, quantity - 1);
    } else {
      removeItem(product.Id);
    }
  };

  return (
    <div 
      className={cn(
        "group relative bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-medium transition-all duration-300",
        "flex flex-col animate-fade-in"
      )}
      dir={dir}
    >
      {/* Image */}
      <div className="relative aspect-square bg-secondary overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <Package className="w-16 h-16 text-muted-foreground/40" />
          </div>
        )}
        
        {/* Service badge */}
        {product.IsService && (
          <span className="absolute top-3 start-3 px-2 py-1 bg-teal text-teal-foreground text-xs font-medium rounded-full">
            {t('services')}
          </span>
        )}

        {/* Quantity badge when in cart */}
        {quantity > 0 && (
          <div className="absolute top-3 end-3 w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm shadow-medium animate-scale-in">
            {quantity}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">
          {displayName}
        </h3>
        
        {displayDescription && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {displayDescription}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(product.Price, language)}
          </span>

          {quantity === 0 ? (
            <Button
              variant="gold"
              size="touch"
              onClick={handleAddToCart}
              className="flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{t('addToCart')}</span>
            </Button>
          ) : (
            <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={handleDecrement}
                className="hover:bg-destructive/20 hover:text-destructive"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-bold text-foreground">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={handleIncrement}
                className="hover:bg-primary/20 hover:text-primary"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
