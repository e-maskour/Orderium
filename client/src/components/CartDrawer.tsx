import { useLanguage } from '@/context/LanguageContext';
import { useCart, CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { productTranslations } from '@/data/mockProducts';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QuantityStepper } from './QuantityStepper';
import { ShoppingBag, Trash2, ArrowRight, ArrowLeft, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartItemRow = ({ item }: { item: CartItem }) => {
  const { language, dir } = useLanguage();
  const { updateQuantity, removeItem } = useCart();
  
  const translation = productTranslations[item.product.Id];
  const displayName = language === 'fr' && translation ? translation.name : item.product.Name;

  return (
    <div className="flex gap-3 py-4 border-b border-border last:border-0" dir={dir}>
      {/* Image */}
      <div className="w-20 h-20 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
        {item.product.imageUrl ? (
          <img
            src={item.product.imageUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground line-clamp-2 leading-tight mb-1">
          {displayName}
        </h4>
        <p className="text-sm font-semibold text-primary mb-2">
          {formatCurrency(item.product.Price, language)}
        </p>
        
        <div className="flex items-center justify-between">
          <QuantityStepper
            quantity={item.quantity}
            onIncrement={() => updateQuantity(item.product.Id, item.quantity + 1)}
            onDecrement={() => updateQuantity(item.product.Id, item.quantity - 1)}
            onRemove={() => removeItem(item.product.Id)}
            size="sm"
            showRemove
          />
          
          <span className="font-bold text-foreground">
            {formatCurrency(item.product.Price * item.quantity, language)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  const { language, t, dir } = useLanguage();
  const { items, subtotal, itemCount, clearCart } = useCart();

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={dir === 'rtl' ? 'left' : 'right'} 
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center justify-between" dir={dir}>
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              {t('yourCart')}
              {itemCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({itemCount} {itemCount === 1 ? t('item') : t('items')})
                </span>
              )}
            </span>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 me-1" />
                {t('clearCart')}
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4" dir={dir}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('emptyCart')}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t('emptyCartMessage')}
              </p>
              <Button variant="outline" onClick={onClose}>
                {t('continueShopping')}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <CartItemRow key={item.product.Id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer with total and checkout */}
        {items.length > 0 && (
          <div className="border-t border-border p-4 space-y-4 bg-card" dir={dir}>
            <div className="flex items-center justify-between text-lg">
              <span className="text-muted-foreground">{t('subtotal')}</span>
              <span className="font-bold text-foreground">
                {formatCurrency(subtotal, language)}
              </span>
            </div>
            
            <Button
              variant="cart"
              size="touchLg"
              className="w-full"
              asChild
              onClick={onClose}
            >
              <Link to="/checkout">
                {t('checkout')}
                <ArrowIcon className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
