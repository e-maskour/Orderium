/**
 * StatusBadge — semantic status pill.
 *
 * Renders the token-driven `.erp-badge` classes (defined in theme.css) so all
 * status indicators share one AA-compliant color system. Accepts either the
 * literal document status names (paid/unpaid/partial/pending/draft/active) or
 * generic semantic tones (success/danger/warning/info/neutral/brand).
 */
import type { ReactNode } from 'react';
import { cx } from './cx';

export type StatusTone =
  | 'paid'
  | 'unpaid'
  | 'partial'
  | 'pending'
  | 'draft'
  | 'active'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'brand'
  | 'neutral';

const toneClass: Record<StatusTone, string> = {
  paid: 'erp-badge--paid',
  unpaid: 'erp-badge--unpaid',
  partial: 'erp-badge--partial',
  pending: 'erp-badge--pending',
  draft: 'erp-badge--draft',
  active: 'erp-badge--active',
  // semantic aliases
  success: 'erp-badge--paid',
  danger: 'erp-badge--unpaid',
  warning: 'erp-badge--partial',
  info: 'erp-badge--active',
  brand: 'erp-badge--active',
  neutral: 'erp-badge--draft',
};

export interface StatusBadgeProps {
  /** @default 'neutral' */
  tone?: StatusTone;
  label: ReactNode;
  /** Optional leading icon node (lucide). */
  icon?: ReactNode;
  /** Show a leading status dot in the current color. */
  dot?: boolean;
  /** @default 'md' */
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  tone = 'neutral',
  label,
  icon,
  dot,
  size = 'md',
  className,
}: StatusBadgeProps) {
  return (
    <span className={cx('erp-badge', toneClass[tone], size === 'sm' && 'erp-badge--sm', className)}>
      {dot && <span className="erp-badge__dot" aria-hidden="true" />}
      {icon != null && (
        <span className="erp-badge__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {label}
    </span>
  );
}

export default StatusBadge;
