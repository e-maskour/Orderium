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
    <div>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{t('confirmPrice')}</div>
      <div style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '0.25rem' }}>{product.name}</div>
      {product.code && (
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
          {t('code')}: {product.code}
        </div>
      )}
    </div>
  );

  const footerContent = hasValidPrice ? (
    <Button
      label={t('confirm')}
      icon={<Check style={{ width: 16, height: 16, marginRight: 6 }} />}
      onClick={handleConfirm}
      style={{ width: '100%' }}
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
      style={{ width: '95vw', maxWidth: '32rem' }}
      contentStyle={{ padding: '1rem' }}
    >
      <div className="flex flex-column gap-3">
        {/* Price Input */}
        <div className="flex flex-column gap-2">
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            {t('price')} ({t('currency')})
          </label>
          <InputText
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={price}
            onChange={handleInputChange}
            style={{ height: '3.5rem', fontSize: '1.75rem', fontWeight: 700, textAlign: 'center', width: '100%' }}
          />
          <div className="flex align-items-center justify-content-center gap-3" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            <span>
              {t('originalPrice')}: {product.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
            </span>
            {product.cost != null && (
              <span style={{ color: '#d97706', fontWeight: 500 }}>
                {t('cost')}: {product.cost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
              </span>
            )}
          </div>
        </div>

        {/* Numeric Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {numbers.map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              style={{
                height: '3rem',
                fontSize: '1.125rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                border: num === 'C' ? 'none' : '1px solid #d1d5db',
                background: num === 'C' ? '#ef4444' : '#f3f4f6',
                color: num === 'C' ? '#fff' : '#111827',
                cursor: 'pointer',
                transition: 'background 0.15s',
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
