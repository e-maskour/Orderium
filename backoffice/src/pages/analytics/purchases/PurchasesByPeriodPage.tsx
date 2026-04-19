import { ShoppingCart } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportChart from '../components/ReportChart';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const COLUMNS = [
  { field: 'reference', header: 'Référence' },
  { field: 'date', header: 'Date' },
  { field: 'supplier', header: 'Fournisseur' },
  { field: 'total', header: 'Montant (MAD)', body: (row: Record<string, unknown>) => Number(row.total).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) },
  { field: 'status', header: 'Statut' },
];

const PurchasesByPeriodPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getPurchasesByPeriod(filter));
  const handleFilterChange = (f: ReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  return (
    <ReportLayout
      icon={ShoppingCart}
      title="Achats par période"
      subtitle="Évolution des dépenses fournisseurs"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.PURCHASES.BY_PERIOD + '/xlsx', filter)} xlsxFilename="achats-periode.xlsx" />}
    />
  );
};

export default PurchasesByPeriodPage;
