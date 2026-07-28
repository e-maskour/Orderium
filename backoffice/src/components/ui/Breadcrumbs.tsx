/**
 * Breadcrumbs — navigation trail for nested pages.
 *
 * Renders a semantic <nav><ol> with router links for ancestors and an
 * aria-current marker on the active page. Separator chevron flips under RTL.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cx } from './cx';

export interface BreadcrumbItem {
  label: ReactNode;
  /** Router path. Omit (or it being the last item) renders plain text. */
  to?: string;
  /** Optional leading icon node (lucide). */
  icon?: ReactNode;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  /** Custom separator node. @default <ChevronRight /> */
  separator?: ReactNode;
}

export function Breadcrumbs({ items, className, separator }: BreadcrumbsProps) {
  const sep = separator ?? <ChevronRight aria-hidden="true" />;

  return (
    <nav aria-label="Breadcrumb">
      <ol className={cx('ui-breadcrumbs', className)}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i}>
              {item.to != null && !last ? (
                <Link to={item.to}>
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <span
                  className={last ? 'ui-breadcrumbs__current' : undefined}
                  aria-current={last ? 'page' : undefined}
                >
                  {item.icon}
                  {item.label}
                </span>
              )}
              {!last && <span className="ui-breadcrumbs__sep">{sep}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
