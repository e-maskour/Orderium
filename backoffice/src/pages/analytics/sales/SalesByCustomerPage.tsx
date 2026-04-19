import { Users } from 'lucide-react';
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
  { field: 'customerName', header: 'Client' },
  { field: 'orderCount', header: 'Nb commandes' },
  {
    field: 'totalRevenue',
    header: 'CA (MAD)',
    body: (row: Record<string, unknown>) =>
      Number(row.totalRevenue).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
  },
];

const SalesByCustomerPage: React.FC = () => {
  const [filter, setFilter] = useState<SalesReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSalesByCustomer(filter),
  );
  const handleFilterChange = (f: SalesReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  return (
    <ReportLayout
      icon={Users}
      title="Ventes par client"
      subtitle="Montant total commandé par client"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.SALES.BY_CUSTOMER + '/xlsx', filter)}
          xlsxFilename="ventes-client.xlsx"
        />
      }
    />
  );
};

export default SalesByCustomerPage;
