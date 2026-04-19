import { LayoutGrid } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportChart from '../components/ReportChart';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { SalesReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const COLUMNS = [
  { field: 'categoryName', header: 'Catégorie' },
  { field: 'totalQty', header: 'Qté vendue' },
  { field: 'totalRevenue', header: 'CA (MAD)', body: (row: Record<string, unknown>) => Number(row.totalRevenue).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) },
];

const SalesByCategoryPage: React.FC = () => {
  const [filter, setFilter] = useState<SalesReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getSalesByCategory(filter));
  const handleFilterChange = (f: SalesReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  return (
    <ReportLayout
      icon={LayoutGrid}
      title="Ventes par catégorie"
      subtitle="Répartition du chiffre d'affaires par catégorie"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.SALES.BY_CATEGORY + '/xlsx', filter)} xlsxFilename="ventes-categorie.xlsx" />}
    />
  );
};

export default SalesByCategoryPage;
