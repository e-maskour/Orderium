import { Award } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) =>
  Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const COLUMNS = [
  { field: 'rank', header: '#' },
  { field: 'supplierName', header: 'Fournisseur' },
  { field: 'orderCount', header: 'Nb commandes' },
  {
    field: 'totalAmount',
    header: 'Total (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'totalAmount'),
  },
];

const TopSuppliersPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_year' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getTopSuppliers(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  return (
    <ReportLayout
      icon={Award}
      title="Top fournisseurs"
      subtitle="Fournisseurs par volume d'achats"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.SUPPLIERS.TOP + '/xlsx', filter)}
          xlsxFilename="top-fournisseurs.xlsx"
        />
      }
    />
  );
};

export default TopSuppliersPage;
