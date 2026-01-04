import { useState, useEffect, useRef } from 'react';
import { X, ShoppingCart } from 'lucide-react';

interface Product {
  Id: number;
  Name: string;
  Price: number;
  Stock?: number;
  Code?: string;
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

  if (!product || !isOpen) return null;

  const maxQuantity = product.Stock ?? 999;

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

  const totalPrice = product.Price * (parseInt(quantity) || 0);
  const hasQuantity = quantity !== '' && parseInt(quantity) > 0;
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-[95vw] mx-4 overflow-hidden animate-fade-in">
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
              {product.Name}
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-primary">
                {product.Price.toFixed(2)} {t('currency')}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                {t('perUnit') || 'per unit'}
              </span>
            </div>
            {product.Code && (
              <p className="text-xs text-gray-500">
                {t('code')}: {product.Code}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Quantity Input */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 block">
              {t('quantity') || 'Quantity'}
            </label>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              value={quantity}
              onChange={handleInputChange}
              className="w-full h-12 sm:h-14 text-2xl sm:text-3xl font-bold text-center bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="0"
              max={maxQuantity}
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
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300'
                }`}
              >
                {num === 'C' ? (
                  <span className="text-xs sm:text-sm">{t('clear') || 'Clear'}</span>
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
                {t('total') || 'Total'}
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
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 text-white hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              {initialQuantity > 0 ? t('updateQty') || 'Update Quantity' : t('addToCart') || 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
