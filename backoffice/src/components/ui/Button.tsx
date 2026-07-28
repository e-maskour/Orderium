/**
 * Button — shared enterprise button.
 *
 * Thin wrapper over PrimeReact <Button> that maps a small set of semantic
 * variants/sizes to PrimeReact props, while rendering lucide-react icons via
 * the `leftIcon` / `rightIcon` props (PrimeReact's own `icon` prop expects a
 * PrimeIcons class string, which this app does not use).
 *
 * Visual styling (color, radius, hover/active) is inherited from the themed
 * `.p-button` rules in theme.css, so this stays consistent with any not-yet
 * migrated raw PrimeReact buttons during the redesign.
 */
import type { ReactNode } from 'react';
import { Button as PrimeButton } from 'primereact/button';
import type { ButtonProps as PrimeButtonProps } from 'primereact/button';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<
  PrimeButtonProps,
  'size' | 'icon' | 'severity' | 'children'
> {
  /** Semantic variant — maps to PrimeReact severity/outlined/text. @default 'primary' */
  variant?: ButtonVariant;
  /** @default 'md' */
  size?: ButtonSize;
  /** Icon node (lucide) rendered before the label. */
  leftIcon?: ReactNode;
  /** Icon node (lucide) rendered after the label. */
  rightIcon?: ReactNode;
  /** Text label. Alternatively pass children. */
  label?: string;
  children?: ReactNode;
}

const variantMap: Record<ButtonVariant, Partial<PrimeButtonProps>> = {
  primary: {},
  secondary: { outlined: true },
  ghost: { text: true },
  danger: { severity: 'danger' },
  success: { severity: 'success' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  label,
  children,
  className,
  loading,
  disabled,
  ...rest
}: ButtonProps) {
  const sizeProp = size === 'sm' ? 'small' : size === 'lg' ? 'large' : undefined;
  const content = label ?? children;
  const iconOnly = content == null && (leftIcon != null || rightIcon != null);

  return (
    <PrimeButton
      {...variantMap[variant]}
      size={sizeProp}
      loading={loading}
      disabled={disabled}
      className={cx('ui-btn', `ui-btn--${variant}`, iconOnly && 'p-button-icon-only', className)}
      {...rest}
    >
      {leftIcon != null && (
        <span className="ui-btn__icon ui-btn__icon--left" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      {content != null && <span className="ui-btn__label">{content}</span>}
      {rightIcon != null && (
        <span className="ui-btn__icon ui-btn__icon--right" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </PrimeButton>
  );
}

export default Button;
