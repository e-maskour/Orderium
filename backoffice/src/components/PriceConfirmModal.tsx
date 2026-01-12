import { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

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
  if (!document.head.querySelector('[data-price-modal-animations]')) {
    styleSheet.setAttribute('data-price-modal-animations', 'true');
    document.head.appendChild(styleSheet);
  }
}

interface Product {
  Id: number;
  Name: string;
  Price: number;
  ImageUrl?: string;
  Code?: string;
}

interface PriceConfirmModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (price: number) => void;
  language?: string;
  t: (key: string) => string;
}

export const PriceConfirmModal = ({ 
  product, 
  isOpen, 
  onClose, 
  onConfirm,
  t 
}: PriceConfirmModalProps) => {
  const [price, setPrice] = useState('');
  const [decimalMode, setDecimalMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && product) {
      setPrice(product.Price.toFixed(2));
      setDecimalMode(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, product]);

  if (!product || !isOpen) return null;

  const handleNumberClick = (num: string) => {
    if (num === 'C') {
      setPrice('');
      setDecimalMode(false);
    } else if (num === '.') {
      if (!price.includes('.')) {
        setPrice(price || '0' + '.');
        setDecimalMode(true);
      }
    } else {
      const newValue = price === '' || price === '0' ? num : price + num;
      // Limit to 2 decimal places
      if (decimalMode) {
        const parts = newValue.split('.');
        if (parts[1] && parts[1].length > 2) return;
      }
      setPrice(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow numbers and one decimal point
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setPrice(value);
      setDecimalMode(value.includes('.'));
    }
  };

  const handleConfirm = () => {
    const priceValue = parseFloat(price);
    if (priceValue > 0) {
      onConfirm(priceValue);
      setPrice('');
      setDecimalMode(false);
      onClose();
    }
  };

  const handleClose = () => {
    setPrice('');
    setDecimalMode(false);
    onClose();
  };

  const hasValidPrice = price !== '' && parseFloat(price) > 0;
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'C'];

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
              {t('confirmPrice')}
            </h2>
            <p className="text-sm text-gray-600">{product.Name}</p>
            {product.Code && (
              <p className="text-xs text-gray-500">
                {t('code')}: {product.Code}
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
          {/* Price Input */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 block">
              {t('price')} ({t('currency')})
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={price}
              onChange={handleInputChange}
              className="w-full h-12 sm:h-14 text-2xl sm:text-3xl font-bold text-center bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <p className="text-xs text-gray-500 text-center">
              {t('originalPrice')}: {product.Price.toFixed(2)} {t('currency')}
            </p>
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
                  <span className="text-xs sm:text-sm">{t('clear')}</span>
                ) : (
                  num
                )}
              </button>
            ))}
          </div>

          {/* Confirm Button */}
          {hasValidPrice && (
            <button
              onClick={handleConfirm}
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 text-white hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                animation: 'contentFadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.05s backwards'
              }}
            >
              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('confirm')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
