import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, X, Package } from 'lucide-react';
import { formatAmount } from '@orderium/ui';

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
  t,
}: ProductQuantityModalProps) => {
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuantity(initialQuantity > 0 ? initialQuantity.toString() : '');
    }
  }, [isOpen, initialQuantity]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setQuantity('');
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !product) return null;

  const maxQuantity = product.stock ?? 999;
  const qty = parseFloat(quantity) || 0;
  const hasQuantity = quantity !== '' && qty > 0;
  const totalPrice = product.price * qty;
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.'];
  const unitCode = product.saleUnitOfMeasure?.code || 'UNIT';

  const handleNumberClick = (num: string) => {
    if (num === 'C') {
      setQuantity('');
    } else if (num === '.') {
      if (!quantity.includes('.')) {
        setQuantity(quantity === '' ? '0.' : quantity + '.');
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
    let v = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
    if (v.includes('.')) {
      const [int, dec] = v.split('.');
      if (dec && dec.length > 2) v = int + '.' + dec.substring(0, 2);
    }
    setQuantity(v === '0' ? '' : v);
  };

  const handleAddToCart = () => {
    if (qty > 0) {
      onAddToCart(qty);
      setQuantity('');
      onClose();
    }
  };

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
          .pos-modal-card { max-width: 100%; border-radius: 1.25rem 1.25rem 0 0; max-height: 92vh; overflow-y: auto; animation: posSheetIn 0.28s cubic-bezier(0.32,0.72,0,1) !important; }
        }
        .pos-key { transition: background 0.1s, transform 0.08s, box-shadow 0.1s; cursor: pointer; border: none; user-select: none; }
        .pos-key:hover:not(:disabled) { filter: brightness(0.92); }
        .pos-key:active:not(:disabled) { transform: scale(0.93); }
        .pos-qty-field:focus { outline: none; border-color: #235ae4 !important; box-shadow: 0 0 0 3px rgba(35,90,228,0.16) !important; }
        .pos-add-btn { transition: filter 0.15s, transform 0.1s, box-shadow 0.15s; }
        .pos-add-btn:hover:not(:disabled) { filter: brightness(1.06); box-shadow: 0 6px 20px rgba(35,90,228,0.45) !important; }
        .pos-add-btn:active:not(:disabled) { transform: scale(0.98); }
      `}</style>

      <div
        className="pos-modal-card"
        style={{
          background: '#ffffff',
          width: '100%',
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
          }}
        >
          {/* Close */}
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
              <ShoppingCart
                style={{ width: '1.375rem', height: '1.375rem', color: '#93b4f8' }}
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
                {t('quantity')}
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
                {product.name}
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.3rem',
                  marginTop: '0.3rem',
                }}
              >
                <span
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    color: '#93b4f8',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {formatAmount(product.price, 2)} {t('currency')}
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: 'rgba(255,255,255,0.35)',
                    fontWeight: 500,
                  }}
                >
                  / {unitCode}
                </span>
              </div>
            </div>
          </div>

          {/* Stock pill */}
          {product.stock != null && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginTop: '0.875rem',
                padding: '0.25rem 0.625rem',
                background: 'rgba(255,255,255,0.07)',
                borderRadius: '2rem',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Package
                style={{ width: '0.7rem', height: '0.7rem', color: 'rgba(255,255,255,0.4)' }}
              />
              <span
                style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}
              >
                {t('available')}:{' '}
                <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{maxQuantity}</strong>
              </span>
            </div>
          )}
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
          {/* Display */}
          <div
            style={{
              background: '#fff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '0.875rem',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {t('quantity')}
              </p>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={handleInputChange}
                placeholder="0"
                className="pos-qty-field"
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  color: hasQuantity ? '#0f172a' : '#cbd5e1',
                  background: 'transparent',
                  border: 'none',
                  width: '100%',
                  outline: 'none',
                  padding: 0,
                  margin: '0.1rem 0 0',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  fontFamily: 'inherit',
                }}
              />
            </div>
            {hasQuantity && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {t('total')}
                </p>
                <p
                  style={{
                    margin: '0.1rem 0 0',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#235ae4',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatAmount(totalPrice, 2)} {t('currency')}
                </p>
              </div>
            )}
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
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '0 1.25rem 1.25rem', background: '#f8fafc' }}>
          <button
            onClick={handleAddToCart}
            disabled={!hasQuantity}
            className="pos-add-btn"
            style={{
              width: '100%',
              height: '3rem',
              background: hasQuantity
                ? 'linear-gradient(135deg, #235ae4 0%, #1a47b8 100%)'
                : '#e2e8f0',
              border: 'none',
              borderRadius: '0.875rem',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: hasQuantity ? '#fff' : '#94a3b8',
              cursor: hasQuantity ? 'pointer' : 'default',
              boxShadow: hasQuantity ? '0 4px 14px rgba(35,90,228,0.35)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontFamily: 'inherit',
              letterSpacing: '-0.01em',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
          >
            <ShoppingCart style={{ width: '1rem', height: '1rem' }} strokeWidth={2.5} />
            {initialQuantity > 0 ? t('updateQty') : t('addToCart')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
