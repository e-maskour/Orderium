import { useLanguage } from '@/context/LanguageContext';
import { useCart, CartItem } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { productTranslations } from '@/data/mockProducts';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QuantityStepper } from './QuantityStepper';
import { ShoppingBag, Trash2, ArrowRight, ArrowLeft, Package, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ProductQuantityModal } from './ProductQuantityModal';
import { Product } from '@/types/database';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isPanelMode?: boolean; // true for desktop panel, false for mobile drawer
}

const CartItemRow = ({ item, onItemClick }: { item: CartItem; onItemClick: (item: CartItem) => void }) => {
  const { language, dir } = useLanguage();
  const { removeItem } = useCart();
  
  const translation = productTranslations[item.product.Id];
  const displayName = language === 'fr' && translation ? translation.name : item.product.Name;

  return (
    <div 
      onClick={() => onItemClick(item)}
      className="flex gap-2 py-2 border-b border-gray-200 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors rounded-md px-2 -mx-2" 
      dir={dir}
    >
      {/* Image */}
      <div className="w-12 h-12 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
        {item.product.imageUrl ? (
          <img
            src={item.product.imageUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-0.5">
          <h4 className="font-medium text-gray-900 line-clamp-1 leading-tight text-xs">
            {displayName}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              removeItem(item.product.Id);
            }}
            className="h-5 w-5 -mt-0.5 -me-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        
        <p className="text-[10px] text-gray-500 mb-1">
          {formatCurrency(item.product.Price, language)} × {item.quantity}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
            {language === 'ar' ? `الكمية: ${item.quantity}` : `Qté: ${item.quantity}`}
          </span>
          
          <span className="font-bold text-gray-900 text-xs">
            {formatCurrency(item.product.Price * item.quantity, language)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Import Plus icon
import { Plus } from 'lucide-react';

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
        
        <div className="h-full flex flex-col" dir={dir}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              {t('yourCart')}
            </h2>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          {itemCount > 0 && (
            <p className="text-sm text-gray-500">
              {uniqueProductCount} {uniqueProductCount === 1 ? (language === 'ar' ? 'منتج' : 'produit') : (language === 'ar' ? 'منتجات' : 'produits')} - {itemCount} {itemCount === 1 ? (language === 'ar' ? 'قطعة' : 'article') : (language === 'ar' ? 'قطع' : 'articles')}
            </p>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4" dir={dir}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <ShoppingBag className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                {t('emptyCart')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('emptyCartMessage')}
              </p>
            </div>
          ) : (
            <div className="py-3">
              {items.map((item) => (
                <CartItemRow key={item.product.Id} item={item} onItemClick={handleItemClick} />
              ))}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3" dir={dir}>
            {/* Total Amount */}
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900">{t('totalAmount')}</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(subtotal, language)}
              </span>
            </div>
            
            {/* Checkout Button */}
            <Button
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              asChild
            >
              <Link to="/checkout" className="flex items-center justify-center gap-2">
                {t('checkout')}
                <ArrowIcon className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
      </>
    );
  }

  // Drawer Mode (Mobile)
  return (
    <>
      <ProductQuantityModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialQuantity={initialQuantity}
      />
      
      <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={dir === 'rtl' ? 'left' : 'right'} 
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="p-4 border-b border-gray-200">
          <SheetTitle className="flex items-center justify-between" dir={dir}>
            <span className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <ShoppingBag className="w-5 h-5 text-primary" />
              {t('yourCart')}
              {itemCount > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({uniqueProductCount} {uniqueProductCount === 1 ? (language === 'ar' ? 'منتج' : 'produit') : (language === 'ar' ? 'منتجات' : 'produits')} - {itemCount} {itemCount === 1 ? (language === 'ar' ? 'قطعة' : 'article') : (language === 'ar' ? 'قطع' : 'articles')})
                </span>
              )}
            </span>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4" dir={dir}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <ShoppingBag className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('emptyCart')}
              </h3>
              <p className="text-gray-500 mb-6">
                {t('emptyCartMessage')}
              </p>
              <Button variant="outline" onClick={onClose} className="h-11 px-6">
                {t('continueShopping')}
              </Button>
            </div>
          ) : (
            <div className="py-3">
              {items.map((item) => (
                <CartItemRow key={item.product.Id} item={item} onItemClick={handleItemClick} />
              ))}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3" dir={dir}>
            {/* Total Amount */}
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900">{t('totalAmount')}</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(subtotal, language)}
              </span>
            </div>
            
            {/* Checkout Button */}
            <Button
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              asChild
              onClick={onClose}
            >
              <Link to="/checkout" className="flex items-center justify-center gap-2">
                {t('checkout')}
                <ArrowIcon className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
};
