import { useState, useEffect, useRef } from 'react';
import { Product } from '@/types/database';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { productTranslations } from '@/data/mockProducts';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductQuantityModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  initialQuantity?: number;
}

export const ProductQuantityModal = ({ product, isOpen, onClose, initialQuantity = 0 }: ProductQuantityModalProps) => {
  const { language, t, dir } = useLanguage();
  const { addItem, updateQuantity, getItemQuantity } = useCart();
  const [quantity, setQuantity] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Set initial quantity when modal opens
  useEffect(() => {
    if (isOpen && initialQuantity > 0) {
      setQuantity(initialQuantity.toString());
    } else if (isOpen) {
      setQuantity('');
    }
    
    // Auto-focus input when modal opens
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialQuantity]);

  if (!product) return null;

  const currentCartQuantity = getItemQuantity(product.Id);
  const isOutOfStock = product.Stock !== undefined && product.Stock <= 0;
  const maxQuantity = product.Stock ?? 999;
  
  const translation = productTranslations[product.Id];
  const displayName = language === 'fr' && translation ? translation.name : product.Name;

  const handleNumberClick = (num: string) => {
    if (num === 'C') {
      setQuantity('');
    } else {
      const newValue = quantity === '' ? num : quantity + num;
      const numValue = parseInt(newValue);
      if (numValue <= maxQuantity && numValue > 0) {
        setQuantity(newValue);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '' || value === '0') {
      setQuantity('');
    } else {
      const numValue = parseInt(value);
      if (numValue <= maxQuantity) {
        setQuantity(value);
      }
    }
  };

  const handleAddToCart = () => {
    const qty = parseInt(quantity);
    // If initialQuantity was provided, we're updating an existing cart item
    if (initialQuantity > 0) {
      updateQuantity(product.Id, qty);
    } else if (currentCartQuantity > 0) {
      updateQuantity(product.Id, currentCartQuantity + qty);
    } else {
      for (let i = 0; i < qty; i++) {
        addItem(product);
      }
    }
    setQuantity('');
    onClose();
  };

  const handleClose = () => {
    setQuantity('');
    onClose();
  };

  const totalPrice = product.Price * (parseInt(quantity) || 0);
  const hasQuantity = quantity !== '' && parseInt(quantity) > 0;
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0'];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden" dir={dir}>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-4 border-b border-gray-200">
          <button
            onClick={handleClose}
            className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm transition-all hover:scale-110"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>

          <div className="space-y-2 pe-10">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {displayName}
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">
                {formatCurrency(product.Price, language)}
              </span>
              <span className="text-sm text-gray-500">
                {language === 'ar' ? '/ وحدة' : '/ unité'}
              </span>
            </div>
            {product.Code && (
              <p className="text-xs text-gray-500">
                {language === 'ar' ? 'الرمز' : 'Code'}: {product.Code}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Quantity Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">
              {language === 'ar' ? 'الكمية' : 'Quantité'}
            </label>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              value={quantity}
              onChange={handleInputChange}
              autoFocus
              className="w-full h-14 text-3xl font-bold text-center bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="0"
              max={maxQuantity}
            />
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {numbers.map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                className={cn(
                  "h-12 text-lg font-semibold rounded-lg transition-all active:scale-95",
                  num === 'C'
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-sm"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300"
                )}
              >
                {num === 'C' ? (
                  <span className="text-sm">{language === 'ar' ? 'مسح' : 'Effacer'}</span>
                ) : (
                  num
                )}
              </button>
            ))}
          </div>

          {/* Total Price */}
          {hasQuantity && (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <span className="text-sm font-semibold text-gray-700">
                {language === 'ar' ? 'المجموع' : 'Total'}
              </span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(totalPrice, language)}
              </span>
            </div>
          )}

          {/* Add to Cart Button */}
          {hasQuantity && (
            <Button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={cn(
                "w-full h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all",
                isOutOfStock
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 text-white hover:scale-[1.02]"
              )}
            >
              <ShoppingCart className="w-5 h-5 me-2" />
              {isOutOfStock 
                ? t('outOfStock')
                : currentCartQuantity > 0
                  ? (language === 'ar' ? 'إضافة المزيد' : 'Ajouter plus')
                  : (language === 'ar' ? 'أضف إلى السلة' : 'Ajouter au panier')
              }
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
