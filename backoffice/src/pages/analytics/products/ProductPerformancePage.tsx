import { BarChart2 } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportKpiCards from '../components/ReportKpiCards';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const COLUMNS = [
  { field: 'productName', header: 'Produit' },
  { field: 'totalQty', header: 'Qté vendue' },
  { field: 'totalRevenue', header: 'CA (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'totalRevenue') },
  { field: 'orderCount', header: 'Nb commandes' },
];

const ProductPerformancePage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getProductPerformance(filter));
  const handleFilterChange = (f: ReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  const kpis = data ? [
    { label: 'Produits vendus', value: Number(data.kpis.uniqueProducts ?? 0), color: 'blue' as const },
    { label: 'CA total produits', value: Number(data.kpis.totalRevenue ?? 0), suffix: 'MAD', color: 'green' as const },
  ] : [];

  return (
    <ReportLayout
      icon={BarChart2}
      title="Performance produits"
      subtitle="Quantités vendues et CA par produit"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.PRODUCTS.PERFORMANCE + '/xlsx', filter)} xlsxFilename="performance-produits.xlsx" />}
    />
  );
};

export default ProductPerformancePage;
