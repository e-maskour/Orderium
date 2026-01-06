import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '@/types/database';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { productTranslations } from '@/data/mockProducts';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const backdropAnimation = `
  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const modalAnimation = `
  @keyframes modalSlideUp {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

const contentAnimation = `
  @keyframes contentStagger {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = backdropAnimation + modalAnimation + contentAnimation;
  if (!document.head.querySelector('[data-modal-content-animations]')) {
    styleSheet.setAttribute('data-modal-content-animations', 'true');
    document.head.appendChild(styleSheet);
  }
}

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

  useEffect(() => {
    if (isOpen && product) {
      const currentQty = initialQuantity || getItemQuantity(product.Id);
      if (currentQty > 0) {
        setQuantity(currentQty.toString());
      } else {
        setQuantity('');
      }
    }
    
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialQuantity, product, getItemQuantity]);

  if (!product || !isOpen) return null;

  const currentCartQuantity = getItemQuantity(product.Id);
  const isOutOfStock = product.Stock !== undefined && product.Stock <= 0;
  const maxQuantity = product.Stock ?? 999;
  const translation = productTranslations[product.Id];
  const displayName = language === 'fr' && translation ? translation.name : product.Name;

  const handleNumberClick = (num: string) => {
    if (isOutOfStock) return; // Prevent input if out of stock
    
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
    if (isOutOfStock) return; // Prevent input if out of stock
    
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
    if (isOutOfStock) return; // Don't allow adding out of stock products
    
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return;
    
    // Validate against stock
    const finalQty = Math.min(qty, maxQuantity);
    
    if (currentCartQuantity > 0) {
      updateQuantity(product.Id, finalQty);
    } else {
      for (let i = 0; i < finalQty; i++) {
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

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir={dir}>
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        style={{ animation: 'backdropFadeIn 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' }}
      />
      <div 
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-[95vw] mx-4 overflow-hidden"
        style={{ animation: 'modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-3 sm:p-4 border-b border-gray-200">
          <button
            onClick={handleClose}
            className={cn("absolute top-3 sm:top-4 w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm transition-all hover:scale-110", dir === 'rtl' ? 'left-3 sm:left-4' : 'right-3 sm:right-4')}
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
          <div className={cn("space-y-1.5 sm:space-y-2", dir === 'rtl' ? 'pl-10 sm:pl-12' : 'pr-10 sm:pr-12')}>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{displayName}</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-primary">{formatCurrency(product.Price, language)}</span>
              <span className="text-xs sm:text-sm text-gray-500">{t('perUnit')}</span>
            </div>
            {product.Code && <p className="text-xs text-gray-500">{t('code')}: {product.Code}</p>}
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4" style={{ animation: 'contentStagger 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s backwards' }}>
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 block">{t('quantity')}</label>
            <input ref={inputRef} type="number" inputMode="numeric" value={quantity} onChange={handleInputChange} className="w-full h-12 sm:h-14 text-2xl sm:text-3xl font-bold text-center bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" min="0" max={maxQuantity} />
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {numbers.map((num) => (
              <button key={num} onClick={() => handleNumberClick(num)} className={cn("h-11 sm:h-12 text-base sm:text-lg font-semibold rounded-lg transition-all active:scale-95", num === 'C' ? "bg-red-500 hover:bg-red-600 text-white shadow-sm" : "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300")}>
                {num === 'C' ? <span className="text-xs sm:text-sm">{t('clear')}</span> : num}
              </button>
            ))}
          </div>
          {hasQuantity && (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20" style={{ animation: 'contentStagger 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' }}>
              <span className="text-sm font-semibold text-gray-700">{t('total')}</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalPrice, language)}</span>
            </div>
          )}
          {hasQuantity && (
            <Button onClick={handleAddToCart} disabled={isOutOfStock} className={cn("w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]", isOutOfStock ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-primary hover:bg-primary/90 text-white hover:scale-[1.02]")} style={{ animation: 'contentStagger 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.05s backwards' }}>
              <ShoppingCart className={cn("w-4 h-4 sm:w-5 sm:h-5", dir === 'rtl' ? 'ms-2' : 'me-2')} />
              {isOutOfStock ? t('outOfStock') : currentCartQuantity > 0 ? t('updateQty') : t('addToCart')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
