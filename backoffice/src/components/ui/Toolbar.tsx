/**
 * Toolbar — horizontal action/filter bar with left + right slots.
 *
 * Token-driven replacement for the ad-hoc `.erp-toolbar`-style rows. The right
 * slot auto-pushes to the trailing edge (RTL aware).
 */
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface ToolbarProps {
  /** Leading content (search, filters, title). */
  left?: ReactNode;
  /** Trailing content (primary actions) — pushed to the far edge. */
  right?: ReactNode;
  /** Free-form children rendered between left and right. */
  children?: ReactNode;
  className?: string;
}

export function Toolbar({ left, right, children, className }: ToolbarProps) {
  return (
    <div className={cx('ui-toolbar', className)} role="toolbar">
      {left != null && <div className="ui-toolbar__left">{left}</div>}
      {children}
      {right != null && <div className="ui-toolbar__right">{right}</div>}
    </div>
  );
}

export default Toolbar;
