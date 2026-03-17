import { Plus, Minus, Trash2 } from 'lucide-react';

interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showRemove?: boolean;
}

export const QuantityStepper = ({
  quantity,
  onIncrement,
  onDecrement,
  onRemove,
  size = 'md',
  showRemove = false,
}: QuantityStepperProps) => {
  const btnPx = size === 'lg' ? '0.625rem' : size === 'sm' ? '0.3rem' : '0.45rem';
  const iconSize = size === 'sm' ? '0.875rem' : '1rem';

  return (
    <div className="flex align-items-center gap-1 surface-100 border-round-xl p-1">
      {showRemove && quantity === 1 ? (
        <button
          onClick={onRemove}
          aria-label="Remove"
          style={{ background: 'none', border: 'none', borderRadius: '50%', padding: btnPx, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
        >
          <Trash2 style={{ width: iconSize, height: iconSize }} />
        </button>
      ) : (
        <button
          onClick={onDecrement}
          disabled={quantity <= 1 && !showRemove}
          aria-label="Decrease"
          style={{ background: 'none', border: 'none', borderRadius: '50%', padding: btnPx, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', opacity: quantity <= 1 && !showRemove ? 0.4 : 1 }}
        >
          <Minus style={{ width: iconSize, height: iconSize }} />
        </button>
      )}

      <span className="font-bold text-color text-center" style={{ minWidth: size === 'lg' ? '3rem' : '2rem', fontSize: size === 'lg' ? '1.125rem' : undefined }}>
        {quantity}
      </span>

      <button
        onClick={onIncrement}
        aria-label="Increase"
        style={{ background: 'none', border: 'none', borderRadius: '50%', padding: btnPx, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}
      >
        <Plus style={{ width: iconSize, height: iconSize }} />
      </button>
    </div>
  );
};
