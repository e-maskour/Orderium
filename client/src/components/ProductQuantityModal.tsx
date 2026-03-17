import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '@/types/database';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/i18n';
import { InputText } from 'primereact/inputtext';
import { ShoppingCart, X } from 'lucide-react';

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
      const currentQty = initialQuantity || getItemQuantity(product.id);
      if (currentQty > 0) {
        setQuantity(currentQty.toString());
      } else {
        setQuantity('');
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuantity('');
    }
  }, [isOpen, product?.id, initialQuantity]);

  if (!product || !isOpen) return null;

  const currentCartQuantity = getItemQuantity(product.id);
  const displayName = product.name;

  const handleNumberClick = (num: string) => {
    if (num === 'C') {
      setQuantity('');
    } else if (num === '.') {
      if (!quantity.includes('.')) {
        const newValue = quantity === '' ? '0.' : quantity + '.';
        setQuantity(newValue);
      }
    } else {
      const newValue = quantity === '' ? num : quantity + num;
      if (newValue.includes('.')) {
        const [, decimal] = newValue.split('.');
        if (decimal && decimal.length > 2) return;
      }
      setQuantity(newValue);
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    let sanitizedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;

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
    if (!qty || qty <= 0) return;

    if (currentCartQuantity > 0) {
      updateQuantity(product.id, qty);
    } else {
      if (qty % 1 !== 0) {
        addItem(product, qty);
      } else {
        for (let i = 0; i < qty; i++) {
          addItem(product);
        }
      }
    }
    setQuantity('');
    onClose();
  };

  const handleClose = () => {
    setQuantity('');
    onClose();
  };

  const totalPrice = product.price * (parseFloat(quantity) || 0);
  const hasQuantity = quantity !== '' && parseFloat(quantity) > 0;
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.'];
  const unitCode = product.saleUnitOfMeasure?.code || 'UNIT';

  const modalContent = (
    <div className="fixed flex align-items-center justify-content-center" style={{ inset: 0, zIndex: 50, pointerEvents: 'none' }} dir={dir}>
      <div
        className="absolute"
        onClick={handleClose}
        style={{ inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 0, pointerEvents: 'auto', animation: 'backdropFadeIn 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' }}
      />
      <div
        className="relative surface-card border-round-2xl shadow-8 overflow-hidden"
        style={{ maxWidth: '32rem', width: '95vw', margin: '0 1rem', zIndex: 10, pointerEvents: 'auto', animation: 'modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        <div className="relative p-3 border-bottom-1 surface-border" style={{ background: 'linear-gradient(to bottom right, rgba(var(--primary-color-rgb, 16,185,129), 0.1), rgba(var(--primary-color-rgb, 16,185,129), 0.05))' }}>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: '0.75rem', [dir === 'rtl' ? 'left' : 'right']: '0.75rem',
              width: '2rem', height: '2rem', borderRadius: '50%',
              border: '1px solid var(--surface-border)', background: 'var(--surface-card)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.2s',
            }}
          >
            <X style={{ width: '1rem', height: '1rem', color: 'var(--text-color)' }} />
          </button>
          <div style={{ [dir === 'rtl' ? 'paddingLeft' : 'paddingRight']: '2.5rem' }}>
            <h2 className="text-base font-bold text-color mb-1" style={{ lineHeight: '1.25' }}>{displayName}</h2>
            <div className="flex align-items-baseline gap-2">
              <span className="text-lg font-bold text-primary">{formatCurrency(product.price, language)}</span>
              <span className="text-xs text-color-secondary">/ {unitCode}</span>
            </div>
            {product.code && <p className="text-xs text-color-secondary mt-1 mb-0">{t('code')}: {product.code}</p>}
          </div>
        </div>
        <div className="p-3 flex flex-column gap-3" style={{ animation: 'contentStagger 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s backwards' }}>
          <div className="flex flex-column gap-2">
            <label className="text-xs font-semibold text-color-secondary">{t('quantity')}</label>
            <InputText
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={handleInputChange}
              className="w-full text-center font-bold border-round-xl border-2 surface-border"
              style={{ height: '3.5rem', fontSize: '1.5rem', background: 'var(--surface-50)', outline: 'none', transition: 'border-color 0.2s' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.375rem' }}>
            {numbers.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberClick(num)}
                className={`cl-key${num === 'C' ? ' clear' : num === '.' ? ' decimal' : ''}`}
              >
                {num === 'C' ? <span style={{ fontSize: '0.75rem' }}>{t('clear')}</span> : num}
              </button>
            ))}
          </div>
          {hasQuantity && (
            <div className="flex align-items-center justify-content-between p-3 border-round-xl border-1" style={{ background: 'linear-gradient(to right, rgba(var(--primary-color-rgb, 16,185,129), 0.05), rgba(var(--primary-color-rgb, 16,185,129), 0.1))', borderColor: 'rgba(var(--primary-color-rgb, 16,185,129), 0.2)', animation: 'contentStagger 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' }}>
              <span className="text-sm font-semibold text-color-secondary">{t('total')}</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalPrice, language)}</span>
            </div>
          )}
          {hasQuantity && (
            <button
              type="button"
              onClick={handleAddToCart}
              className="cl-btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', animation: 'contentStagger 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.05s backwards' }}
            >
              <ShoppingCart style={{ width: '1.125rem', height: '1.125rem' }} />
              {currentCartQuantity > 0 ? t('updateQty') : t('addToCart')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
