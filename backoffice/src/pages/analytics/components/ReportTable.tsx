import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column, type ColumnProps } from 'primereact/column';
import { Paginator } from 'primereact/paginator';
import { formatDate, formatQuantity } from '@orderium/ui';
import { useLanguage } from '../../../context/LanguageContext';
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination';

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
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DECIMAL_RE = /^-?\d+\.\d+$/;

/** Default cell rendering: French dates (dd/MM/yyyy) and comma decimals. */
function formatCell(value: unknown): React.ReactNode {
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

const ReportTable: React.FC<ReportTableProps> = ({
  columns,
  rows,
  total,
  page = 1,
  perPage = 50,
  onPageChange,
  loading,
}) => {
  const { t } = useLanguage();

  return (
    <div>
      <DataTable
        value={rows}
        loading={loading}
        size="small"
        stripedRows
        scrollable
        scrollHeight="500px"
        emptyMessage={t('reportNoDataAvailable')}
      >
        {columns.map((col) => (
          <Column
            key={col.field}
            body={(row: Record<string, unknown>) => formatCell(row[col.field])}
            {...col}
          />
        ))}
      </DataTable>
      {total !== undefined && onPageChange && (
        <Paginator
          first={(page - 1) * perPage}
          rows={perPage}
          totalRecords={total}
          onPageChange={(e) => onPageChange(Math.floor(e.first / e.rows) + 1, e.rows)}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          template="CurrentPageReport PrevPageLink PageLinks NextPageLink RowsPerPageDropdown"
          currentPageReportTemplate={t('pageReportTemplate')}
          className="mt-2"
        />
      )}
    </div>
  );
};

export default ReportTable;
