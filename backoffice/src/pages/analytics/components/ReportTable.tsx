import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column, type ColumnProps } from 'primereact/column';
import { Paginator } from 'primereact/paginator';

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

const ReportTable: React.FC<ReportTableProps> = ({
  columns,
  rows,
  total,
  page = 1,
  perPage = 50,
  onPageChange,
  loading,
}) => {
  return (
    <div>
      <DataTable
        value={rows}
        loading={loading}
        size="small"
        stripedRows
        scrollable
        scrollHeight="500px"
        emptyMessage="Aucune donnée disponible"
      >
        {columns.map((col) => (
          <Column key={col.field} {...col} />
        ))}
      </DataTable>
      {total !== undefined && onPageChange && (
        <Paginator
          first={(page - 1) * perPage}
          rows={perPage}
          totalRecords={total}
          onPageChange={(e) => onPageChange(Math.floor(e.first / e.rows) + 1, e.rows)}
          rowsPerPageOptions={[25, 50, 100]}
          className="mt-2"
        />
      )}
    </div>
  );
};

export default ReportTable;
