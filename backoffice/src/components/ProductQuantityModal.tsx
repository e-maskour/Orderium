import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      if (initialQuantity > 0) {
        setQuantity(initialQuantity.toString());
      } else {
        setQuantity('');
      }
    }
  }, [isOpen, initialQuantity]);



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
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <div style={{
        width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
        background: 'linear-gradient(135deg, #1e1e2d, #16213e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(30,30,45,0.25)',
      }}>
        <ShoppingCart style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b' }} strokeWidth={2.2} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', lineHeight: 1.3 }}>{product.name}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.01em' }}>
            {product.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>/ {unitCode}</span>
        </div>
        {product.code && (
          <div style={{ fontSize: '0.6875rem', color: '#9ca3af', marginTop: '0.125rem', fontWeight: 500 }}>
            #{product.code}
          </div>
        )}
      </div>
    </div>
  );

  const footerContent = hasQuantity ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #e5e7eb',
      }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{t('total')}</span>
        <span style={{ fontSize: '1.375rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
          {totalPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
        </span>
      </div>
      <Button
        label={initialQuantity > 0 ? t('updateQty') : t('addToCart')}
        icon={<ShoppingCart style={{ width: 14, height: 14, marginRight: 6 }} />}
        onClick={handleAddToCart}
        style={{
          width: '100%', height: '2.875rem',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          border: 'none', borderRadius: '0.625rem',
          fontSize: '0.9375rem', fontWeight: 700, color: '#fff',
          boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
        }}
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
        {/* Quantity Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
              {t('quantity')}
            </label>
            {product.stock && (
              <span style={{ fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 500 }}>
                {t('available')}: {maxQuantity}
              </span>
            )}
          </div>
          <InputText
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={handleInputChange}
            style={{
              height: '4rem', fontSize: '2rem', fontWeight: 800,
              textAlign: 'center', width: '100%',
              borderRadius: '0.75rem', border: '2px solid #e5e7eb',
              color: quantity ? '#111827' : '#9ca3af',
              letterSpacing: '-0.02em',
            }}
          />
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {numbers.map((num) => (
            <Button
              key={num}
              text
              onClick={() => handleNumberClick(num)}
              className="pos-keypad-num"
              style={{
                height: '3.25rem',
                fontSize: num === 'C' ? '0.8125rem' : '1.25rem',
                fontWeight: 700,
                borderRadius: '0.625rem',
                background: num === 'C'
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : num === '.'
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : '#f3f4f6',
                color: num === 'C' || num === '.' ? '#fff' : '#111827',
                boxShadow: num === 'C' ? '0 3px 8px rgba(239,68,68,0.3)' : num === '.' ? '0 3px 8px rgba(59,130,246,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {num === 'C' ? t('clear') : num}
            </Button>
          ))}
        </div>
      </div>
    </Dialog>
  );
};
