import { Button } from 'primereact/button';
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
  const sizeMap = { sm: 'small' as const, md: undefined, lg: 'large' as const };
  const btnSize = sizeMap[size];

  return (
    <div className="flex align-items-center gap-1 surface-100 border-round-xl p-1">
      {showRemove && quantity === 1 ? (
        <Button
          text
          rounded
          severity="danger"
          size={btnSize}
          onClick={onRemove}
          icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />}
          aria-label="Remove"
        />
      ) : (
        <Button
          text
          rounded
          severity="secondary"
          size={btnSize}
          onClick={onDecrement}
          disabled={quantity <= 1 && !showRemove}
          icon={<Minus style={{ width: '1rem', height: '1rem' }} />}
          aria-label="Decrease"
        />
      )}

      <span className="font-bold text-color text-center" style={{ minWidth: size === 'lg' ? '3rem' : '2rem', fontSize: size === 'lg' ? '1.125rem' : undefined }}>
        {quantity}
      </span>

      <Button
        text
        rounded
        severity="secondary"
        size={btnSize}
        onClick={onIncrement}
        icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
        aria-label="Increase"
      />
    </div>
  );
};
