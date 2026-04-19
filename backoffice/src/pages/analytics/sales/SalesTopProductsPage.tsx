import { Trophy } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportKpiCards from '../components/ReportKpiCards';
import ReportChart from '../components/ReportChart';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { SalesReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const COLUMNS = [
  { field: 'productName', header: 'Produit' },
  { field: 'totalQty', header: 'Qté vendue' },
  { field: 'totalRevenue', header: 'CA (MAD)', body: (row: Record<string, unknown>) => Number(row.totalRevenue).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) },
];

const SalesTopProductsPage: React.FC = () => {
  const [filter, setFilter] = useState<SalesReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getSalesTopProducts(filter));
  const handleFilterChange = (f: SalesReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  const kpis = data ? [
    { label: 'Produits uniques vendus', value: Number(data.kpis.uniqueProducts ?? 0), color: 'blue' as const },
    { label: 'Quantité totale', value: Number(data.kpis.totalQty ?? 0), color: 'green' as const },
  ] : [];

  return (
    <ReportLayout
      icon={Trophy}
      title="Top produits vendus"
      subtitle="Classement des produits les plus performants"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.SALES.TOP_PRODUCTS + '/xlsx', filter)} xlsxFilename="top-produits.xlsx" />}
    />
  );
};

export default SalesTopProductsPage;
