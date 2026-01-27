import { useState, useEffect, useRef } from 'react';
import { X, ShoppingCart } from 'lucide-react';

// Keyframe animations for Apple-style entrance
const backdropAnimation = `
  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const modalAnimation = `
  @keyframes modalSlideUp {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const contentAnimation = `
  @keyframes contentFadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Inject keyframes
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = backdropAnimation + modalAnimation + contentAnimation;
  if (!document.head.querySelector('[data-modal-animations]')) {
    styleSheet.setAttribute('data-modal-animations', 'true');
    document.head.appendChild(styleSheet);
  }
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock?: number;
  code?: string;
  imageUrl?: string;
  saleUnitOfMeasure?: {
    id: number;
    name: string;
    code: string;
    category: string;
  };
}

interface ProductQuantityModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (quantity: number) => void;
  initialQuantity?: number;
  language?: string;
  t: (key: string) => string;
}

export const ProductQuantityModal = ({ 
  product, 
  isOpen, 
  onClose, 
  onAddToCart,
  initialQuantity = 0,
  t 
}: ProductQuantityModalProps) => {
  const [quantity, setQuantity] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialQuantity > 0) {
        setQuantity(initialQuantity.toString());
      } else {
        setQuantity('');
      }
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialQuantity]);

  // Keep focus on input
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!product || !isOpen) return null;

  const maxQuantity = product.stock ?? 999;

  const handleNumberClick = (num: string) => {
    if (num === 'C') {
      setQuantity('');
    } else if (num === '.') {
      // Only add decimal point if there isn't one already
      if (!quantity.includes('.')) {
        const newValue = quantity === '' ? '0.' : quantity + '.';
        setQuantity(newValue);
      }
    } else {
      const newValue = quantity === '' ? num : quantity + num;
      // Check if adding this number would exceed 2 decimal places
      if (newValue.includes('.')) {
        const [, decimal] = newValue.split('.');
        if (decimal && decimal.length > 2) {
          return; // Don't add if it would exceed 2 decimal places
        }
      }
      setQuantity(newValue);
    }
    // Restore focus after button click
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    // Only allow one decimal point
    const parts = value.split('.');
    let sanitizedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
    
    // Limit decimal places to 2
    if (sanitizedValue.includes('.')) {
      const [integer, decimal] = sanitizedValue.split('.');
      if (decimal && decimal.length > 2) {
        sanitizedValue = integer + '.' + decimal.substring(0, 2);
      }
    }
    
    if (sanitizedValue === '' || sanitizedValue === '0') {
      setQuantity('');
    } else {
      setQuantity(sanitizedValue);
    }
  };

  const handleAddToCart = () => {
    const qty = parseFloat(quantity);
    if (qty > 0) {
      onAddToCart(qty);
      setQuantity('');
      onClose();
    }
  };

  const handleClose = () => {
    setQuantity('');
    onClose();
  };

  const totalPrice = product.price * (parseFloat(quantity) || 0);
  const hasQuantity = quantity !== '' && parseFloat(quantity) > 0;
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.'];
  
  // Get the unit code from product's saleUnitOfMeasure, default to 'UNIT'
  const unitCode = product.saleUnitOfMeasure?.code || 'UNIT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        style={{
          animation: 'backdropFadeIn 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
        }}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-[95vw] mx-4 overflow-hidden"
        style={{
          animation: 'modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-3 sm:p-4 border-b border-gray-200">
          <button
            onClick={handleClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm transition-all hover:scale-110"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>

          <div className="space-y-1.5 sm:space-y-2 pr-10 sm:pr-12">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              {product.name}
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-primary">
                {product.price.toFixed(2)} {t('currency')}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                / {unitCode}
              </span>
            </div>
            {product.code && (
              <p className="text-xs text-gray-500">
                {t('code')}: {product.code}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div 
          className="p-3 sm:p-4 space-y-3 sm:space-y-4"
          style={{
            animation: 'contentFadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s backwards'
          }}
        >
          {/* Quantity Input */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 block">
              {t('quantity')} {product.stock && `(${t('available')}: ${maxQuantity})`}
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={handleInputChange}
              className="w-full h-12 sm:h-14 text-2xl sm:text-3xl font-bold text-center bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {numbers.map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                className={`h-11 sm:h-12 text-base sm:text-lg font-semibold rounded-lg transition-all active:scale-95 ${
                  num === 'C'
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                    : num === '.'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300'
                }`}
              >
                {num === 'C' ? (
                  <span className="text-xs sm:text-sm">{t('clear')}</span>
                ) : (
                  num
                )}
              </button>
            ))}
          </div>

          {/* Total Price */}
          {hasQuantity && (
            <div 
              className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20"
              style={{
                animation: 'contentFadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
              }}
            >
              <span className="text-sm font-semibold text-gray-700">
                {t('total')}
              </span>
              <span className="text-xl font-bold text-primary">
                {totalPrice.toFixed(2)} {t('currency')}
              </span>
            </div>
          )}

          {/* Add to Cart Button */}
          {hasQuantity && (
            <button
              onClick={handleAddToCart}
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 text-white hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                animation: 'contentFadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.05s backwards'
              }}
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              {initialQuantity > 0 ? t('updateQty') : t('addToCart')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
