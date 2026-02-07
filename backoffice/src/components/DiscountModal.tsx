import { useState, useEffect, useRef } from 'react';
import { X, Tag, Percent, DollarSign } from 'lucide-react';

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

interface DiscountModalProps {
  productName: string;
  quantity: number;
  unitPrice: number;
  currentDiscount: number;
  currentDiscountType: number; // 0 = fixed amount, 1 = percentage
  isOpen: boolean;
  onClose: () => void;
  onApply: (discount: number, discountType: number) => void;
  t: (key: string) => string;
}

export const DiscountModal = ({ 
  productName,
  quantity,
  unitPrice,
  currentDiscount,
  currentDiscountType,
  isOpen, 
  onClose, 
  onApply,
  t 
}: DiscountModalProps) => {
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<number>(0); // 0 = amount, 1 = percentage
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDiscount(currentDiscount > 0 ? currentDiscount.toString() : '');
      setDiscountType(currentDiscountType);
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, currentDiscount, currentDiscountType]);

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

  if (!isOpen) return null;

  const subtotal = unitPrice * quantity;
  const discountValue = parseFloat(discount) || 0;
  const discountAmount = discountType === 1 
    ? (subtotal * discountValue) / 100 
    : discountValue;
  const total = subtotal - discountAmount;
  
  const maxDiscount = discountType === 1 ? 100 : subtotal;

  const handleNumberClick = (num: string) => {
    if (num === 'C') {
      setDiscount('');
    } else if (num === '.') {
      // Only add decimal point if there isn't one already
      if (!discount.includes('.')) {
        const newValue = discount === '' ? '0.' : discount + '.';
        setDiscount(newValue);
      }
    } else {
      const newValue = discount === '' ? num : discount + num;
      // Check if adding this number would exceed 2 decimal places
      if (newValue.includes('.')) {
        const [, decimal] = newValue.split('.');
        if (decimal && decimal.length > 2) {
          return; // Don't add if it would exceed 2 decimal places
        }
      }
      // Check max value
      const numValue = parseFloat(newValue);
      if (numValue > maxDiscount) {
        return;
      }
      setDiscount(newValue);
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
    
    // Check max value
    const numValue = parseFloat(sanitizedValue);
    if (numValue > maxDiscount) {
      return;
    }
    
    setDiscount(sanitizedValue);
  };

  const handleApply = () => {
    const discountValue = parseFloat(discount) || 0;
    onApply(discountValue, discountType);
    setDiscount('');
    onClose();
  };

  const handleClose = () => {
    setDiscount('');
    onClose();
  };

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.'];

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
        <div className="relative bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-3 sm:p-4 border-b border-gray-200">
          <button
            onClick={handleClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm transition-all hover:scale-110"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>

          <div className="space-y-1.5 sm:space-y-2 pr-10 sm:pr-12">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-600" />
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                {t('applyDiscount') || 'Apply Discount'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              {productName}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-gray-900">
                {subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                ({quantity} × {unitPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div 
          className="p-3 sm:p-4 space-y-3 sm:space-y-4"
          style={{
            animation: 'contentFadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s backwards'
          }}
        >
          {/* Discount Type Selector */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 block">
              {t('discountType') || 'Discount Type'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setDiscountType(0);
                  setDiscount('');
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className={`h-10 sm:h-11 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  discountType === 0
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                {t('amount') || 'Amount'}
              </button>
              <button
                onClick={() => {
                  setDiscountType(1);
                  setDiscount('');
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className={`h-10 sm:h-11 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  discountType === 1
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <Percent className="w-4 h-4" />
                {t('percentage') || 'Percentage'}
              </button>
            </div>
          </div>

          {/* Discount Input */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 block">
              {t('discount')} {discountType === 1 ? '(%)' : `(${t('currency')})`}
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={discount}
              onChange={handleInputChange}
              className="w-full h-12 sm:h-14 text-2xl sm:text-3xl font-bold text-center bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
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

          {/* Discount Summary */}
          {discountValue > 0 && (
            <div 
              className="space-y-2 p-3 bg-gradient-to-r from-orange-500/5 to-orange-500/10 rounded-xl border border-orange-500/20"
              style={{
                animation: 'contentFadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
              }}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('subtotal')}</span>
                <span className="font-semibold text-gray-900">
                  {subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('discount')}</span>
                <span className="font-semibold text-orange-600">
                  -{discountAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-orange-500/20">
                <span className="font-semibold text-gray-700">{t('total')}</span>
                <span className="text-xl font-bold text-orange-600">
                  {total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                </span>
              </div>
            </div>
          )}

          {/* Apply Button */}
          <button
            onClick={handleApply}
            className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all bg-orange-500 hover:bg-orange-600 text-white hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              animation: 'contentFadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.05s backwards'
            }}
          >
            <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
            {t('apply') || 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};
