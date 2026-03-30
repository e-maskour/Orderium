/**
 * AppDataTable — Enterprise DataTable Wrapper
 *
 * A polished wrapper around PrimeReact DataTable that adds:
 *  - Integrated toolbar with search input + custom slots
 *  - Skeleton loading rows (first load) instead of raw spinner overlay
 *  - Custom empty state with icon, title, and description
 *  - Automatic .dt-card container styling
 *
 * Usage:
 *   <AppDataTable
 *     value={items}
 *     loading={isLoading}
 *     searchValue={search}
 *     onSearchChange={setSearch}
 *     searchPlaceholder="Search products..."
 *     emptyIcon={Package}
 *     emptyTitle="No products found"
 *     emptyDescription="Try adjusting your search or filters."
 *     toolbarContent={<Button label="Add" />}
 *   >
 *     <Column field="name" header="Name" />
 *   </AppDataTable>
 */

import React from 'react';
import { DataTable } from 'primereact/datatable';
import type { DataTableProps, DataTableValueArray } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Search } from 'lucide-react';
import { EmptyState } from './EmptyState';

// ─── Loading Skeleton ────────────────────────────────────────────────────────

interface SkeletonRowProps {
    columns: number;
    /** Optionally control individual cell widths */
    widths?: string[];
}

function SkeletonRow({ columns, widths }: SkeletonRowProps) {
    const defaultWidths = ['70%', '55%', '65%', '45%', '35%', '25%', '15%'];
    return (
        <div className="dt-skeleton-row">
            {Array.from({ length: columns }).map((_, i) => (
                <div
                    key={i}
                    className="dt-skeleton dt-skeleton--text"
                    style={{ width: widths?.[i] ?? defaultWidths[i % defaultWidths.length], flex: i === 0 ? '1.5' : '1' }}
                />
            ))}
        </div>
    );
}

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    /** Show a faint header bar above the skeleton rows */
    showHeader?: boolean;
}

export function TableSkeleton({ rows = 8, columns = 5, showHeader = true }: TableSkeletonProps) {
    return (
        <div>
            {showHeader && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.875rem 1.25rem',
                        background: '#f8fafc',
                        borderBottom: '2px solid #e2e8f0',
                        gap: '1.5rem',
                    }}
                >
                    {Array.from({ length: columns }).map((_, i) => (
                        <div
                            key={i}
                            className="dt-skeleton dt-skeleton--text-sm"
                            style={{ width: i === 0 ? '4rem' : '5rem', flex: i === 0 ? 'none' : '1' }}
                        />
                    ))}
                </div>
            )}
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonRow key={i} columns={columns} />
            ))}
        </div>
    );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

export interface DataTableEmptyStateProps {
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    title?: string;
    description?: string;
}

export function DataTableEmptyState({ icon, title, description }: DataTableEmptyStateProps) {
    return (
        <EmptyState
            icon={icon}
            title={title ?? 'No results found'}
            description={description ?? 'Try adjusting your search or filter criteria.'}
        />
    );
}

// ─── AppDataTable ─────────────────────────────────────────────────────────────

export type AppDataTableProps<TValue extends DataTableValueArray> = DataTableProps<TValue> & {
    /** Search input value */
    searchValue?: string;
    /** Called on every keystroke in the search input */
    onSearchChange?: (value: string) => void;
    /** Placeholder text for the search input */
    searchPlaceholder?: string;
    /**
     * Content rendered to the RIGHT of the search input in the toolbar.
     * Use for filter chips, badge counts, or extra buttons.
     */
    toolbarContent?: React.ReactNode;
    /**
     * Number of skeleton rows shown during the initial load
     * (when `loading` is true AND `value` is empty / undefined).
     * @default 8
     */
    skeletonRows?: number;
    /**
     * Number of columns in the skeleton rows.
     * @default 5
     */
    skeletonColumns?: number;
    /** Show a fake header above the skeleton rows */
    skeletonShowHeader?: boolean;
    /** Icon for the empty state */
    emptyIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    /** Title for the empty state */
    emptyTitle?: string;
    /** Description for the empty state */
    emptyDescription?: string;
    /**
     * When true, the wrapper renders a `.dt-card` container with border
     * and shadow. Set to false if you want to manage the card styling yourself.
     * @default true
     */
    withCard?: boolean;
};

/**
 * AppDataTable<T>
 *
 * Drop-in replacement for PrimeReact `<DataTable>` with built-in:
 * search bar, skeleton loading, and custom empty state.
 */
export function AppDataTable<TValue extends DataTableValueArray>({
    // toolbar
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search…',
    toolbarContent,
    // skeleton
    skeletonRows = 8,
    skeletonColumns = 5,
    skeletonShowHeader = true,
    // empty state
    emptyIcon,
    emptyTitle,
    emptyDescription,
    // card wrapper
    withCard = true,
    // DataTable props
    loading,
    value,
    className,
    children,
    ...rest
}: AppDataTableProps<TValue>) {
    const hasData = Array.isArray(value) && value.length > 0;
    const isInitialLoad = loading && !hasData;

    const showToolbar = onSearchChange != null || toolbarContent != null;

    const tableContent = (
        <>
            {/* ── Toolbar ── */}
            {showToolbar && (
                <div className="dt-toolbar">
                    {onSearchChange != null && (
                        <div className="dt-search-wrapper">
                            <Search className="dt-search-icon" aria-hidden="true" />
                            <InputText
                                value={searchValue ?? ''}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="dt-search-input"
                            />
                        </div>
                    )}
                    {toolbarContent != null && (
                        <div className="dt-toolbar-right">{toolbarContent}</div>
                    )}
                </div>
            )}

            {/* ── Body: skeleton OR DataTable ── */}
            {isInitialLoad ? (
                <TableSkeleton
                    rows={skeletonRows}
                    columns={skeletonColumns}
                    showHeader={skeletonShowHeader}
                />
            ) : (
                <DataTable<TValue>
                    className={className}
                    value={value}
                    /*
                     * Only show the spinner overlay on re-fetches (when data already
                     * exists). Initial loads are handled by the skeleton above.
                     */
                    loading={loading && hasData}
                    emptyMessage={
                        !loading ? (
                            <DataTableEmptyState
                                icon={emptyIcon}
                                title={emptyTitle}
                                description={emptyDescription}
                            />
                        ) : (
                            <></> // hide empty message while loading
                        )
                    }
                    {...rest}
                >
                    {children}
                </DataTable>
            )}
        </>
    );

    if (!withCard) return <>{tableContent}</>;

    return <div className="dt-card">{tableContent}</div>;
}

export default AppDataTable;
