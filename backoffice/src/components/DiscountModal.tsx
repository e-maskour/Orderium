import { useState, useEffect, useRef } from 'react';
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
    <div>
      <div className="flex align-items-center gap-2">
        <Tag style={{ width: 20, height: 20, color: '#ea580c' }} />
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{t('applyDiscount') || 'Apply Discount'}</span>
      </div>
      <div style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '0.25rem' }}>{productName}</div>
      <div className="flex align-items-baseline gap-2" style={{ marginTop: '0.25rem' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
          {subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
        </span>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          ({quantity} × {unitPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
        </span>
      </div>
    </div>
  );

  const footerContent = (
    <Button
      label={t('apply') || 'Apply'}
      icon={<Tag style={{ width: 16, height: 16, marginRight: 6 }} />}
      onClick={handleApply}
      style={{ width: '100%' }}
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
      style={{ width: '95vw', maxWidth: '32rem' }}
      contentStyle={{ padding: '1rem' }}
    >
      <div className="flex flex-column gap-3">
        {/* Discount Type Selector */}
        <div className="flex flex-column gap-2">
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            {t('discountType') || 'Discount Type'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              onClick={() => {
                setDiscountType(0);
                setDiscount('');
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="flex align-items-center justify-content-center gap-2"
              style={{
                height: '2.75rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                border: discountType === 0 ? 'none' : '1px solid #d1d5db',
                background: discountType === 0 ? '#f97316' : '#f3f4f6',
                color: discountType === 0 ? '#fff' : '#374151',
                cursor: 'pointer',
                boxShadow: discountType === 0 ? '0 4px 6px -1px rgba(249,115,22,0.3)' : 'none',
              }}
            >
              <DollarSign style={{ width: 16, height: 16 }} />
              {t('amount') || 'Amount'}
            </button>
            <button
              onClick={() => {
                setDiscountType(1);
                setDiscount('');
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="flex align-items-center justify-content-center gap-2"
              style={{
                height: '2.75rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                border: discountType === 1 ? 'none' : '1px solid #d1d5db',
                background: discountType === 1 ? '#f97316' : '#f3f4f6',
                color: discountType === 1 ? '#fff' : '#374151',
                cursor: 'pointer',
                boxShadow: discountType === 1 ? '0 4px 6px -1px rgba(249,115,22,0.3)' : 'none',
              }}
            >
              <Percent style={{ width: 16, height: 16 }} />
              {t('percentage') || 'Percentage'}
            </button>
          </div>
        </div>

        {/* Discount Input */}
        <div className="flex flex-column gap-2">
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            {t('discount')} {discountType === 1 ? '(%)' : `(${t('currency')})`}
          </label>
          <InputText
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={discount}
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
              }}
            >
              {num === 'C' ? t('clear') : num}
            </button>
          ))}
        </div>

        {/* Discount Summary */}
        {discountValue > 0 && (
          <div className="flex flex-column gap-2" style={{ padding: '0.75rem', background: '#fff7ed', borderRadius: '0.75rem', border: '1px solid #fed7aa' }}>
            <div className="flex align-items-center justify-content-between" style={{ fontSize: '0.875rem' }}>
              <span style={{ color: '#4b5563' }}>{t('subtotal')}</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
              </span>
            </div>
            <div className="flex align-items-center justify-content-between" style={{ fontSize: '0.875rem' }}>
              <span style={{ color: '#4b5563' }}>{t('discount')}</span>
              <span style={{ fontWeight: 600, color: '#ea580c' }}>
                -{discountAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
              </span>
            </div>
            <div className="flex align-items-center justify-content-between" style={{ paddingTop: '0.5rem', borderTop: '1px solid #fed7aa' }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>{t('total')}</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ea580c' }}>
                {total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
              </span>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
