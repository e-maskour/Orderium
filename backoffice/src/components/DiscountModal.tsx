import { useState, useEffect } from 'react';
import { Tag, Percent, DollarSign } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

interface DiscountModalProps {
  productName: string;
  quantity: number;
  unitPrice: number;
  currentDiscount: number;
  currentDiscountType: number;
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
  const [discountType, setDiscountType] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setDiscount(currentDiscount > 0 ? currentDiscount.toString() : '');
      setDiscountType(currentDiscountType);
    }
  }, [isOpen, currentDiscount, currentDiscountType]);



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
      if (!discount.includes('.')) {
        const newValue = discount === '' ? '0.' : discount + '.';
        setDiscount(newValue);
      }
    } else {
      const newValue = discount === '' ? num : discount + num;
      if (newValue.includes('.')) {
        const [, decimal] = newValue.split('.');
        if (decimal && decimal.length > 2) return;
      }
      const numValue = parseFloat(newValue);
      if (numValue > maxDiscount) return;
      setDiscount(newValue);
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

    const numValue = parseFloat(sanitizedValue);
    if (numValue > maxDiscount) return;

    setDiscount(sanitizedValue);
  };

  const handleApply = () => {
    const dv = parseFloat(discount) || 0;
    onApply(dv, discountType);
    setDiscount('');
    onClose();
  };

  const handleClose = () => {
    setDiscount('');
    onClose();
  };

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.'];

  const headerContent = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <div style={{
        width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(245,158,11,0.35)',
      }}>
        <Tag style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{t('applyDiscount') || 'Apply Discount'}</div>
        <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.125rem' }}>{productName}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginTop: '0.1875rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>
            {subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
          </span>
          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
            ({quantity} × {unitPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </span>
        </div>
      </div>
    </div>
  );

  const footerContent = (
    <Button
      label={t('apply') || 'Apply'}
      onClick={handleApply}
      style={{
        width: '100%', height: '2.875rem',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        border: 'none', borderRadius: '0.625rem',
        fontSize: '0.9375rem', fontWeight: 700, color: '#fff',
        boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
      }}
    />
  );

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
        .disc-type-btn { transition: all 0.15s ease; }
        .disc-type-btn:hover { filter: brightness(0.95); }
        .disc-input:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.15) !important; outline: none; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Discount Type Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
            {t('discountType') || 'Discount Type'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              onClick={() => { setDiscountType(0); setDiscount(''); }}
              className="disc-type-btn"
              style={{
                height: '2.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                borderRadius: '0.625rem', fontWeight: 700, fontSize: '0.9375rem',
                border: discountType === 0 ? 'none' : '1.5px solid #e5e7eb',
                background: discountType === 0 ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#f9fafb',
                color: discountType === 0 ? '#fff' : '#6b7280',
                cursor: 'pointer',
                boxShadow: discountType === 0 ? '0 4px 12px rgba(249,115,22,0.35)' : 'none',
              }}
            >
              <DollarSign style={{ width: '1rem', height: '1rem' }} />
              {t('amount') || 'Amount'}
            </button>
            <button
              onClick={() => { setDiscountType(1); setDiscount(''); }}
              className="disc-type-btn"
              style={{
                height: '2.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                borderRadius: '0.625rem', fontWeight: 700, fontSize: '0.9375rem',
                border: discountType === 1 ? 'none' : '1.5px solid #e5e7eb',
                background: discountType === 1 ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#f9fafb',
                color: discountType === 1 ? '#fff' : '#6b7280',
                cursor: 'pointer',
                boxShadow: discountType === 1 ? '0 4px 12px rgba(249,115,22,0.35)' : 'none',
              }}
            >
              <Percent style={{ width: '1rem', height: '1rem' }} />
              {t('percentage') || 'Percentage'}
            </button>
          </div>
        </div>

        {/* Discount Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
            {t('discount')} {discountType === 1 ? '(%)' : `(${t('currency')})`}
          </label>
          <InputText
            type="text"
            inputMode="decimal"
            value={discount}
            onChange={handleInputChange}
            className="disc-input"
            style={{
              height: '4rem', fontSize: '2rem', fontWeight: 800,
              textAlign: 'center', width: '100%',
              borderRadius: '0.75rem', border: '2px solid #e5e7eb',
              color: discount ? '#ea580c' : '#9ca3af',
              letterSpacing: '-0.02em', transition: 'all 0.2s',
            }}
          />
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
                fontSize: num === 'C' ? '0.8125rem' : num === '.' ? '1.5rem' : '1.25rem',
                fontWeight: 700,
                borderRadius: '0.625rem',
                border: 'none',
                background: num === 'C'
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : num === '.'
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : '#f3f4f6',
                color: num === 'C' || num === '.' ? '#fff' : '#111827',
                cursor: 'pointer',
                boxShadow: num === 'C'
                  ? '0 3px 8px rgba(239,68,68,0.3)'
                  : num === '.'
                    ? '0 3px 8px rgba(59,130,246,0.3)'
                    : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {num === 'C' ? t('clear') : num}
            </button>
          ))}
        </div>

        {/* Discount Summary */}
        {discountValue > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.875rem', background: '#fff7ed', borderRadius: '0.875rem', border: '1.5px solid #fed7aa' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>{t('subtotal')}</span>
              <span style={{ fontWeight: 700, color: '#374151' }}>
                {subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>{t('discount')}</span>
              <span style={{ fontWeight: 700, color: '#ea580c' }}>
                -{discountAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1.5px solid #fed7aa' }}>
              <span style={{ fontWeight: 700, color: '#374151', fontSize: '0.9375rem' }}>{t('total')}</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ea580c' }}>
                {total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
              </span>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
