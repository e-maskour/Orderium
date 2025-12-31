import { Button } from '@/components/ui/button';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  const buttonSizes = {
    sm: 'iconSm' as const,
    md: 'icon' as const,
    lg: 'iconLg' as const,
  };

  return (
    <div className={cn('flex items-center gap-1 bg-secondary rounded-xl p-1', sizeClasses[size])}>
      {showRemove && quantity === 1 ? (
        <Button
          variant="ghost"
          size={buttonSizes[size]}
          onClick={onRemove}
          className="hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size={buttonSizes[size]}
          onClick={onDecrement}
          disabled={quantity <= 1 && !showRemove}
          className="hover:bg-muted"
        >
          <Minus className="w-4 h-4" />
        </Button>
      )}
      
      <span className={cn(
        'min-w-[2rem] text-center font-bold text-foreground',
        size === 'lg' && 'min-w-[3rem] text-lg'
      )}>
        {quantity}
      </span>
      
      <Button
        variant="ghost"
        size={buttonSizes[size]}
        onClick={onIncrement}
        className="hover:bg-primary/20 hover:text-primary"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
};
