import { UserX } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const COLUMNS = [
  { field: 'customerName', header: 'Client' },
  { field: 'lastOrderDate', header: 'Dernière commande' },
  { field: 'daysSinceLastOrder', header: 'Jours d\'inactivité' },
  { field: 'totalOrders', header: 'Total commandes' },
];

const InactiveClientsPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_year' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getInactiveClients(filter));
  const handleFilterChange = (f: ReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  return (
    <ReportLayout
      icon={UserX}
      title="Clients inactifs"
      subtitle="Clients sans commande depuis plus de 90 jours"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.CLIENTS.INACTIVE + '/xlsx', filter)} xlsxFilename="clients-inactifs.xlsx" />}
    />
  );
};

export default InactiveClientsPage;
