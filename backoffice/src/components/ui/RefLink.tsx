import type { MouseEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { ReturnToState } from '../../lib/entityRoutes';
import { cx } from './cx';

export interface RefLinkProps {
  /** Target route, e.g. entityRoutes.customer(12). Renders plain text when missing. */
  to?: string | null;
  children: ReactNode;
  /** Label of the current page for the "Retour à …" button. Defaults to the page title. */
  fromLabel?: string;
  /** Icon-only button placed next to existing text instead of wrapping it. */
  iconOnly?: boolean;
  className?: string;
  title?: string;
}

/**
 * Link to a record of another module. Opens in the same tab and records where
 * the user came from, so the target page can send them back (useBackNavigation).
 */
export function RefLink({ to, children, fromLabel, iconOnly, className, title }: RefLinkProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!to) return iconOnly ? null : <>{children}</>;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    // Let the browser handle ctrl/cmd/middle-click (open in new tab)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const label =
      fromLabel || document.querySelector('.page-header__title')?.textContent?.trim() || t('back');
    const state: ReturnToState = {
      from: { path: location.pathname + location.search, label },
    };
    navigate(to, { state });
  };

  return (
    <Link
      to={to}
      onClick={handleClick}
      className={cx('ref-link', iconOnly && 'ref-link--icon', className)}
      title={title ?? t('openRecord')}
      aria-label={iconOnly ? (title ?? t('openRecord')) : undefined}
    >
      {!iconOnly && <span className="ref-link__text">{children}</span>}
      <ArrowUpRight className="ref-link__icon" aria-hidden="true" />
    </Link>
  );
}
