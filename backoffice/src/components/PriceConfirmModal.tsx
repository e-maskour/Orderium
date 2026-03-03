import { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

interface Product {
  id: number;
  name: string;
  price: number;
  cost?: number;
  imageUrl?: string;
  code?: string;
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
      setPrice(product.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setDecimalMode(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, product]);

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

  if (!product) return null;

  const handleNumberClick = (num: string) => {
    if (num === 'C') {
      setPrice('');
      setDecimalMode(false);
    } else if (num === '.') {
      if (!price.includes('.')) {
        setPrice((price || '0') + '.');
        setDecimalMode(true);
      }
    } else {
      const newValue = price === '' || price === '0' ? num : price + num;
      if (newValue.includes('.')) {
        const parts = newValue.split('.');
        if (parts[1] && parts[1].length > 2) return;
      }
      setPrice(newValue);
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
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

  const headerContent = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <div style={{
        width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(245,158,11,0.35)',
      }}>
        <Check style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{t('confirmPrice')}</div>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.125rem', fontWeight: 500 }}>{product.name}</div>
        {product.code && (
          <div style={{ fontSize: '0.6875rem', color: '#9ca3af', marginTop: '0.125rem' }}>#{product.code}</div>
        )}
      </div>
    </div>
  );

  const footerContent = hasValidPrice ? (
    <Button
      label={t('confirm')}
      icon={<Check style={{ width: 14, height: 14, marginRight: 6 }} />}
      onClick={handleConfirm}
      style={{
        width: '100%', height: '2.875rem',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        border: 'none', borderRadius: '0.625rem',
        fontSize: '0.9375rem', fontWeight: 700, color: '#fff',
        boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
      }}
    />
  ) : null;

  return (
    <Dialog
      visible={isOpen}
      onHide={handleClose}
      header={headerContent}
      footer={footerContent}
      modal
      dismissableMask
      style={{ width: '95vw', maxWidth: '30rem' }}
      breakpoints={{ '640px': '95vw' }}
      contentStyle={{ padding: '1rem', overflowY: 'auto' }}
    >
      <style>{`
        .pos-keypad-num { transition: all 0.1s ease; }
        .pos-keypad-num:hover { filter: brightness(0.92); }
        .pos-keypad-num:active { transform: scale(0.94); }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Price Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
            {t('price')} ({t('currency')})
          </label>
          <InputText
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={price}
            onChange={handleInputChange}
            style={{
              height: '4rem', fontSize: '2rem', fontWeight: 800,
              textAlign: 'center', width: '100%',
              borderRadius: '0.75rem', border: '2px solid #e5e7eb',
              color: price ? '#111827' : '#9ca3af',
              letterSpacing: '-0.02em',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem' }}>
            <span style={{ color: '#6b7280' }}>
              {t('originalPrice')}: <strong>{product.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}</strong>
            </span>
            {product.cost != null && (
              <span style={{ color: '#d97706', fontWeight: 600 }}>
                {t('cost')}: {product.cost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
              </span>
            )}
          </div>
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {numbers.map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="pos-keypad-num"
              style={{
                height: '3.25rem',
                fontSize: num === 'C' ? '0.8125rem' : '1.25rem',
                fontWeight: 700,
                borderRadius: '0.625rem',
                border: 'none',
                background: num === 'C'
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : '#f3f4f6',
                color: num === 'C' ? '#fff' : '#111827',
                cursor: 'pointer',
                boxShadow: num === 'C' ? '0 3px 8px rgba(239,68,68,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {num === 'C' ? t('clear') : num}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
};
