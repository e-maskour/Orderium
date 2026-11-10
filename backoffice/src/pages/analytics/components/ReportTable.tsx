import React, { useMemo, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column, type ColumnProps } from 'primereact/column';
import { Paginator } from 'primereact/paginator';
import { Inbox, Search, Table2, X } from 'lucide-react';
import { formatDate, formatQuantity } from '@orderium/ui';
import { useLanguage } from '../../../context/LanguageContext';
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { codedValue, isCodedField } from '../../../modules/analytics/analytics.labels';

export interface ReportColumn extends ColumnProps {
  field: string;
  header: string;
}

interface ReportTableProps {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  total?: number;
  page?: number;
  perPage?: number;
  onPageChange?: (page: number, perPage: number) => void;
  loading?: boolean;
  /** Section title. Defaults to the generic "Detailed data" label. */
  title?: string;
  /** Overrides the empty-state text (e.g. "pick a customer first"). */
  emptyMessage?: string;
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DECIMAL_RE = /^-?\d+\.\d+$/;
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

/** Default cell rendering: French dates (dd/MM/yyyy) and comma decimals. */
function formatCell(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="ax-muted">—</span>;
  }
  if (value instanceof Date) return formatDate(value);
  if (typeof value === 'number') return Number.isInteger(value) ? value : formatQuantity(value, 3);
  if (typeof value === 'string') {
    const dateOnly = DATE_ONLY_RE.exec(value);
    if (dateOnly) {
      // Build a local date so the day never shifts with the timezone
      return formatDate(new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]));
    }
    if (DATE_TIME_RE.test(value)) return formatDate(value);
    if (DECIMAL_RE.test(value)) return formatQuantity(value, 3);
  }
  return value as React.ReactNode;
}

function isNumericValue(v: unknown): boolean {
  return typeof v === 'number' || (typeof v === 'string' && NUMERIC_RE.test(v));
}

const ReportTable: React.FC<ReportTableProps> = ({
  columns,
  rows,
  total,
  page = 1,
  perPage = 50,
  onPageChange,
  loading,
  title,
  emptyMessage,
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  // A column is numeric when every non-empty value in the current rows is.
  const numericFields = useMemo(() => {
    const set = new Set<string>();
    for (const col of columns) {
      const values = rows
        .map((r) => r[col.field])
        .filter((v) => v !== null && v !== undefined && v !== '');
      if (values.length > 0 && values.every(isNumericValue)) set.add(col.field);
    }
    return set;
  }, [columns, rows]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      columns.some((c) =>
        (codedValue(c.field, r[c.field], t)?.label ?? String(r[c.field] ?? ''))
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, columns, query, t]);

  const count = total ?? rows.length;
  const filtered = query.trim() !== '';

  return (
    <div className="ax-table">
      <div className="ax-section-head ax-section-head--table">
        <span className="ax-section-head__title">
          <Table2 aria-hidden="true" />
          {title ?? t('analyticsSectionTable')}
          <span className="ax-count">
            {filtered
              ? `${visibleRows.length} / ${rows.length}`
              : t(count === 1 ? 'analyticsRowsCountOne' : 'analyticsRowsCount').replace(
                  '{count}',
                  String(count),
                )}
          </span>
        </span>
        {rows.length > 0 && (
          <label className="ax-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('analyticsTableSearch')}
              aria-label={t('analyticsTableSearch')}
            />
            {query && (
              <button
                type="button"
                className="ax-search__clear"
                onClick={() => setQuery('')}
                aria-label={t('analyticsClearSearch')}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </label>
        )}
      </div>

      <DataTable
        value={visibleRows}
        loading={loading && rows.length === 0}
        size="small"
        stripedRows
        scrollable
        scrollHeight="560px"
        className="ax-datatable"
        emptyMessage={
          <div className="ax-empty">
            <Inbox aria-hidden="true" />
            <p>
              {filtered
                ? t('analyticsSearchNoResults')
                : (emptyMessage ?? t('reportNoDataAvailable'))}
            </p>
          </div>
        }
      >
        {columns.map((col) => {
          const numeric = numericFields.has(col.field);
          return (
            <Column
              key={col.field}
              body={(row: Record<string, unknown>) => {
                if (isCodedField(col.field)) {
                  const coded = codedValue(col.field, row[col.field], t);
                  if (coded?.tone)
                    return <StatusBadge tone={coded.tone} label={coded.label} size="sm" />;
                  if (coded) return coded.label;
                }
                return formatCell(row[col.field]);
              }}
              {...col}
              headerClassName={[numeric && 'ax-num', col.headerClassName].filter(Boolean).join(' ')}
              bodyClassName={[numeric && 'ax-num', col.bodyClassName].filter(Boolean).join(' ')}
            />
          );
        })}
      </DataTable>

      {total !== undefined && onPageChange && total > 0 && (
        <Paginator
          first={(page - 1) * perPage}
          rows={perPage}
          totalRecords={total}
          onPageChange={(e) => onPageChange(Math.floor(e.first / e.rows) + 1, e.rows)}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          template="CurrentPageReport PrevPageLink PageLinks NextPageLink RowsPerPageDropdown"
          currentPageReportTemplate={t('pageReportTemplate')}
          className="ax-paginator"
        />
      )}
    </div>
  );
};

export default ReportTable;
