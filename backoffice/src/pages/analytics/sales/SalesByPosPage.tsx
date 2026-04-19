import { Store } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { SalesReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const COLUMNS = [
  { field: 'channel', header: 'Caisse / POS' },
  { field: 'orderCount', header: 'Nb commandes' },
  {
    field: 'totalRevenue',
    header: 'CA (MAD)',
    body: (row: Record<string, unknown>) =>
      Number(row.totalRevenue).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
  },
];

const SalesByPosPage: React.FC = () => {
  const [filter, setFilter] = useState<SalesReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSalesByPos(filter),
  );
  const handleFilterChange = (f: SalesReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  return (
    <ReportLayout
      icon={Store}
      title="Ventes par caisse"
      subtitle="Performance par point de vente"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.SALES.BY_POS + '/xlsx', filter)}
          xlsxFilename="ventes-caisse.xlsx"
        />
      }
    />
  );
};

export default SalesByPosPage;
