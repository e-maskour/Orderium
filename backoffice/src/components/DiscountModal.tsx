import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Tag, Percent, X } from 'lucide-react';
import { formatAmount } from '@orderium/ui';

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
  t,
}: DiscountModalProps) => {
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setDiscount(currentDiscount > 0 ? currentDiscount.toString() : '');
      setDiscountType(currentDiscountType);
    }
  }, [isOpen, currentDiscount, currentDiscountType]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setDiscount('');
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    },
    [handleClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const subtotal = unitPrice * quantity;
  const discountValue = parseFloat(discount) || 0;
  const discountAmount = discountType === 1 ? (subtotal * discountValue) / 100 : discountValue;
  const total = subtotal - discountAmount;
  const maxDiscount = discountType === 1 ? 100 : subtotal;
  const discountPct =
    discountType === 1 ? discountValue : subtotal > 0 ? (discountValue / subtotal) * 100 : 0;

  const handleNumberClick = (num: string) => {
    if (num === 'C') {
      setDiscount('');
    } else if (num === '.') {
      if (!discount.includes('.')) setDiscount(discount === '' ? '0.' : discount + '.');
    } else {
      const newValue = discount === '' ? num : discount + num;
      if (newValue.includes('.')) {
        const [, decimal] = newValue.split('.');
        if (decimal && decimal.length > 2) return;
      }
      if (parseFloat(newValue) > maxDiscount) return;
      setDiscount(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    let v = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
    if (v.includes('.')) {
      const [int, dec] = v.split('.');
      if (dec && dec.length > 2) v = int + '.' + dec.substring(0, 2);
    }
    if (parseFloat(v) > maxDiscount) return;
    setDiscount(v);
  };

  const handleApply = () => {
    onApply(parseFloat(discount) || 0, discountType);
    setDiscount('');
    onClose();
  };

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.'];

  if (!isOpen) return null;

  const modal = (
    <div
      className="pos-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'posOverlayIn 0.18s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <style>{`
        @keyframes posOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes posModalIn { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes posSheetIn { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        .pos-modal-overlay { padding: 1rem; align-items: center; }
        .pos-modal-card { max-width: 34rem; border-radius: 1.25rem; overflow: hidden; }
        @media (max-width: 640px) {
          .pos-modal-overlay { padding: 0; align-items: flex-end; }
          .pos-modal-card { max-width: 100%; border-radius: 1.25rem 1.25rem 0 0; max-height: 92vh; overflow: hidden; overflow-y: auto; animation: posSheetIn 0.28s cubic-bezier(0.32,0.72,0,1) !important; }
        }
        .pos-key { transition: background 0.1s, transform 0.08s, box-shadow 0.1s; cursor: pointer; border: none; user-select: none; }
        .pos-key:hover:not(:disabled) { filter: brightness(0.92); }
        .pos-key:active:not(:disabled) { transform: scale(0.93); }
        .disc-field:focus { outline: none; border-color: #235ae4 !important; box-shadow: 0 0 0 3px rgba(35,90,228,0.16) !important; }
        .disc-type-seg button { transition: all 0.15s; }
        .pos-apply-btn { transition: filter 0.15s, transform 0.1s, box-shadow 0.15s; }
        .pos-apply-btn:hover:not(:disabled) { filter: brightness(1.06); box-shadow: 0 6px 20px rgba(35,90,228,0.45) !important; }
        .pos-apply-btn:active:not(:disabled) { transform: scale(0.98); }
      `}</style>

      <div
        className="pos-modal-card"
        style={{
          background: '#ffffff',
          width: '100%',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.06)',
          animation: 'posModalIn 0.22s cubic-bezier(0.34,1.36,0.64,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '1.25rem 1.25rem 1rem',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleClose}
            className="pos-key"
            style={{
              position: 'absolute',
              top: '0.875rem',
              right: '0.875rem',
              width: '1.875rem',
              height: '1.875rem',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X style={{ width: '0.9rem', height: '0.9rem', color: 'rgba(255,255,255,0.7)' }} />
          </button>

          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', paddingRight: '2rem' }}
          >
            <div
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '0.875rem',
                flexShrink: 0,
                background: 'rgba(35,90,228,0.25)',
                border: '1px solid rgba(35,90,228,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Tag
                style={{ width: '1.375rem', height: '1.375rem', color: '#ffffff' }}
                strokeWidth={2}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.45)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  margin: '0 0 0.2rem',
                }}
              >
                {t('applyDiscount')}
              </p>
              <h2
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#fff',
                  margin: 0,
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {productName}
              </h2>
            </div>
          </div>

          {/* Subtotal row */}
          <div
            style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', alignItems: 'stretch' }}
          >
            <div
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '0.625rem',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.15rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {t('subtotal')}
              </span>
              <span
                style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}
              >
                {formatAmount(subtotal, 2)} {t('currency')}
              </span>
              <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.35)' }}>
                {quantity} × {formatAmount(unitPrice, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            padding: '1.25rem',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Type segmented control */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.375rem',
              background: '#e2e8f0',
              padding: '0.25rem',
              borderRadius: '0.75rem',
            }}
            className="disc-type-seg"
          >
            {[
              {
                value: 0,
                label: t('amount'),
                icon: <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{t('currency')}</span>,
              },
              {
                value: 1,
                label: t('percentage'),
                icon: (
                  <Percent style={{ width: '0.875rem', height: '0.875rem' }} strokeWidth={2.5} />
                ),
              },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => {
                  setDiscountType(value);
                  setDiscount('');
                }}
                className="pos-key"
                style={{
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  background: discountType === value ? '#fff' : 'transparent',
                  color: discountType === value ? '#235ae4' : '#64748b',
                  boxShadow: discountType === value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Display */}
          <div
            style={{
              background: '#fff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '0.875rem',
              padding: '0.75rem 1rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <p
              style={{
                margin: '0 0 0.25rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {t('discount')} {discountType === 1 ? '(%)' : `(${t('currency')})`}
            </p>
            <input
              type="text"
              inputMode="decimal"
              value={discount}
              onChange={handleInputChange}
              placeholder={discountType === 1 ? '0' : '0.00'}
              className="disc-field"
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: discountValue > 0 ? '#235ae4' : '#cbd5e1',
                background: 'transparent',
                border: 'none',
                width: '100%',
                outline: 'none',
                padding: 0,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Keypad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {numbers.map((num) => {
              const isClear = num === 'C';
              const isDot = num === '.';
              return (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  className="pos-key"
                  style={{
                    height: '3.25rem',
                    fontSize: isClear ? '0.75rem' : isDot ? '1.75rem' : '1.375rem',
                    fontWeight: isClear ? 700 : 600,
                    borderRadius: '0.75rem',
                    fontFamily: 'inherit',
                    background: isClear ? '#fee2e2' : isDot ? '#dbeafe' : '#fff',
                    color: isClear ? '#dc2626' : isDot ? '#1d4ed8' : '#0f172a',
                    border: isClear
                      ? '1.5px solid #fca5a5'
                      : isDot
                        ? '1.5px solid #93c5fd'
                        : '1.5px solid #e2e8f0',
                    boxShadow: isClear
                      ? '0 1px 3px rgba(220,38,38,0.1)'
                      : isDot
                        ? '0 1px 3px rgba(29,78,216,0.1)'
                        : '0 1px 3px rgba(0,0,0,0.05)',
                    lineHeight: 1,
                  }}
                >
                  {isClear ? t('clear') : num}
                </button>
              );
            })}
          </div>

          {/* Live summary */}
          {discountValue > 0 && (
            <div
              style={{
                background: '#fff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '0.875rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.875rem',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                  {t('subtotal')}
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>
                  {formatAmount(subtotal, 2)} {t('currency')}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.875rem',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                  {t('discount')}{' '}
                  {discountType === 1 ? `(${discountValue}%)` : `(${discountPct.toFixed(1)}%)`}
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#235ae4' }}>
                  −{formatAmount(discountAmount, 2)} {t('currency')}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.875rem',
                  background: '#f8fafc',
                }}
              >
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                  {t('total')}
                </span>
                <span
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    color: '#235ae4',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatAmount(total, 2)} {t('currency')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '0 1.25rem 1.25rem', background: '#f8fafc', flexShrink: 0 }}>
          <button
            onClick={handleApply}
            className="pos-apply-btn"
            style={{
              width: '100%',
              height: '3rem',
              background: 'linear-gradient(135deg, #235ae4 0%, #1a47b8 100%)',
              border: 'none',
              borderRadius: '0.875rem',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(35,90,228,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontFamily: 'inherit',
              letterSpacing: '-0.01em',
            }}
          >
            <Tag style={{ width: '1rem', height: '1rem' }} strokeWidth={2.5} />
            {t('apply')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
