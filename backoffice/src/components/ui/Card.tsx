/**
 * Card — generic surface container.
 *
 * Token-driven replacement for the many ad-hoc `<div>` cards across the app.
 * Use `padding` for a plain padded surface, or pass `title`/`header`/`footer`
 * for a chrome'd card (header divider + padded body + footer actions).
 */
import type { ElementType, KeyboardEvent, ReactNode } from 'react';
import { cx } from './cx';

export interface CardProps {
  children: ReactNode;
  /** Render element. @default 'div' */
  as?: ElementType;
  /** Body padding when the card has no header/footer chrome. @default 'md' */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Hover elevation + pointer affordance. */
  interactive?: boolean;
  /** Full custom header node (overrides `title`). */
  header?: ReactNode;
  /** Convenience title rendered in the header bar. */
  title?: ReactNode;
  /** Actions rendered at the right of the header bar. */
  headerActions?: ReactNode;
  /** Footer node (right-aligned action row). */
  footer?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({
  children,
  as,
  padding = 'md',
  interactive,
  header,
  title,
  headerActions,
  footer,
  className,
  onClick,
}: CardProps) {
  const Comp = (as ?? 'div') as ElementType;
  const hasChrome = header != null || title != null || footer != null;
  const bodyClass = hasChrome ? 'ui-card__body' : `ui-card--pad-${padding}`;
  const clickable = interactive && onClick != null;

  const handleKeyDown = clickable
    ? (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick!();
        }
      }
    : undefined;

  return (
    <Comp
      className={cx('ui-card', interactive && 'ui-card--interactive', className)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      {...(clickable ? { role: 'button', tabIndex: 0 } : {})}
    >
      {(header != null || title != null) && (
        <div className="ui-card__header">
          {header ?? <h3 className="ui-card__title">{title}</h3>}
          {headerActions != null && <div className="ui-card__header-actions">{headerActions}</div>}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
      {footer != null && <div className="ui-card__footer">{footer}</div>}
    </Comp>
  );
}

export default Card;
