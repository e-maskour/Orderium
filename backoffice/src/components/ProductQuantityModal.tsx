import { useState, useEffect, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

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

  const maxQuantity = product.stock ?? 999;

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
  const unitCode = product.saleUnitOfMeasure?.code || 'UNIT';

  const headerContent = (
    <div>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{product.name}</div>
      <div className="flex align-items-baseline gap-2" style={{ marginTop: '0.25rem' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-color)' }}>
          {product.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
        </span>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>/ {unitCode}</span>
      </div>
      {product.code && (
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
          {t('code')}: {product.code}
        </div>
      )}
    </div>
  );

  const footerContent = hasQuantity ? (
    <div className="flex flex-column gap-3" style={{ width: '100%' }}>
      <div className="flex align-items-center justify-content-between" style={{ padding: '0.75rem', background: 'var(--primary-50, #f0fdfa)', borderRadius: '0.75rem', border: '1px solid var(--primary-200, #99f6e4)' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{t('total')}</span>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-color)' }}>
          {totalPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
        </span>
      </div>
      <Button
        label={initialQuantity > 0 ? t('updateQty') : t('addToCart')}
        icon={<ShoppingCart style={{ width: 16, height: 16, marginRight: 6 }} />}
        onClick={handleAddToCart}
        style={{ width: '100%' }}
      />
    </div>
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
        {/* Quantity Input */}
        <div className="flex flex-column gap-2">
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            {t('quantity')} {product.stock && `(${t('available')}: ${maxQuantity})`}
          </label>
          <InputText
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={handleInputChange}
            style={{ height: '3.5rem', fontSize: '1.75rem', fontWeight: 700, textAlign: 'center', width: '100%' }}
          />
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
                border: num === 'C' || num === '.' ? 'none' : '1px solid #d1d5db',
                background: num === 'C' ? '#ef4444' : num === '.' ? '#3b82f6' : '#f3f4f6',
                color: num === 'C' || num === '.' ? '#fff' : '#111827',
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
