import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
    /** Lucide or any SVG-compatible icon component */
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    /** Main title line */
    title: string;
    /** Optional subtitle / hint text */
    description?: string;
    /** Optional action element (button, link…) placed below the description */
    action?: React.ReactNode;
    /** Reduces vertical padding — use inside cards, drawers, or modals */
    compact?: boolean;
}

/**
 * EmptyState
 *
 * Universal empty-state display for tables, lists, and any container
 * that can have zero items.
 *
 * @example
 * <EmptyState
 *   icon={ShoppingCart}
 *   title="Aucune commande trouvée"
 *   description="Aucune commande ne correspond à vos critères de recherche. Essayez de modifier les filtres."
 * />
 */
export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    compact = false,
}: EmptyStateProps) {
    return (
        <div className={`es-root${compact ? ' es-root--compact' : ''}`}>
            <div className="es-icon-wrap">
                <Icon className="es-icon" aria-hidden="true" />
            </div>
            <p className="es-title">{title}</p>
            {description && <p className="es-desc">{description}</p>}
            {action && <div className="es-action">{action}</div>}
        </div>
    );
}
