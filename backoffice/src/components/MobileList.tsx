import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface MobileCardConfig<T> {
  /** Bold primary identifier — top-left */
  topLeft: (item: T) => ReactNode;
  /** Key metric / amount — top-right */
  topRight: (item: T) => ReactNode;
  /** Secondary muted detail — bottom-left */
  bottomLeft?: (item: T) => ReactNode;
  /** Status badge pill — bottom-right */
  bottomRight?: (item: T) => ReactNode;
}

interface MobileListProps<T> {
  items: T[];
  config: MobileCardConfig<T>;
  keyExtractor: (item: T) => string | number;
  onTap?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  /** Total record count to show above the list */
  totalCount?: number;
  /** Label after count, e.g. "produits" */
  countLabel?: string;
  /** Whether there are more pages to load */
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

/** Card skeleton shown while first load */
function CardSkeleton() {
  return (
    <div className="ml-card ml-card--skeleton">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div className="erp-skeleton" style={{ height: '1rem', width: '55%', borderRadius: '0.375rem' }} />
        <div className="erp-skeleton" style={{ height: '1rem', width: '25%', borderRadius: '0.375rem' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="erp-skeleton" style={{ height: '0.75rem', width: '40%', borderRadius: '0.375rem' }} />
        <div className="erp-skeleton" style={{ height: '1.25rem', width: '20%', borderRadius: '9999px' }} />
      </div>
    </div>
  );
}

export function MobileList<T>({
  items,
  config,
  keyExtractor,
  onTap,
  loading,
  emptyMessage = 'Aucun résultat trouvé',
  emptyAction,
  totalCount,
  countLabel = 'enregistrements',
  hasMore,
  onLoadMore,
  loadingMore,
}: MobileListProps<T>) {
  if (loading && items.length === 0) {
    return (
      <div className="ml-list">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="erp-empty">
        <p className="erp-empty__title">{emptyMessage}</p>
        {emptyAction && <div style={{ marginTop: '0.5rem' }}>{emptyAction}</div>}
      </div>
    );
  }

  const displayCount = totalCount ?? items.length;

  return (
    <div>
      {/* Record count */}
      <p className="ml-count">
        {displayCount} {countLabel}
      </p>

      <div className="ml-list">
        {items.map((item) => (
          <div
            key={keyExtractor(item)}
            className={`ml-card${onTap ? ' ml-card--tappable' : ''}`}
            onClick={onTap ? () => onTap(item) : undefined}
            role={onTap ? 'button' : undefined}
            tabIndex={onTap ? 0 : undefined}
            onKeyDown={onTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(item); } } : undefined}
          >
            {/* Row 1: top-left + top-right */}
            <div className="ml-card__row ml-card__row--top">
              <span className="ml-card__primary">{config.topLeft(item)}</span>
              <span className="ml-card__value">{config.topRight(item)}</span>
            </div>

            {/* Row 2: bottom-left + bottom-right + chevron */}
            {(config.bottomLeft || config.bottomRight) && (
              <div className="ml-card__row ml-card__row--bottom">
                <span className="ml-card__secondary">{config.bottomLeft?.(item)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {config.bottomRight?.(item)}
                  {onTap && (
                    <ChevronRight className="ml-card__chevron" />
                  )}
                </div>
              </div>
            )}
            {/* Show chevron alone if no bottom content */}
            {!config.bottomLeft && !config.bottomRight && onTap && (
              <ChevronRight className="ml-card__chevron" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          {loadingMore ? (
            <div className="ml-list">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <button className="ml-load-more" onClick={onLoadMore}>
              Charger plus
            </button>
          )}
        </div>
      )}
    </div>
  );
}
