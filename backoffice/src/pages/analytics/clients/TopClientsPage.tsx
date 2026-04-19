import { Star } from 'lucide-react';
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
  { field: 'customerName', header: 'Client' },
  { field: 'orderCount', header: 'Nb commandes' },
  {
    field: 'totalRevenue',
    header: 'CA total (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'totalRevenue'),
  },
  { field: 'lastOrderDate', header: 'Dernière commande' },
];

const TopClientsPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_year' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getTopClients(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  return (
    <ReportLayout
      icon={Star}
      title="Top clients"
      subtitle="Meilleurs clients par chiffre d'affaires"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.CLIENTS.TOP + '/xlsx', filter)}
          xlsxFilename="top-clients.xlsx"
        />
      }
    />
  );
};

export default TopClientsPage;
