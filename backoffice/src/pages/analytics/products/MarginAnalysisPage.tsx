import { PieChart } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });
const PCT = (row: Record<string, unknown>, field: string) => Number(row[field]).toFixed(1) + ' %';

const COLUMNS = [
  { field: 'productName', header: 'Produit' },
  { field: 'totalQty', header: 'Qté vendue' },
  { field: 'totalRevenue', header: 'CA (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'totalRevenue') },
  { field: 'totalCost', header: 'Coût (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'totalCost') },
  { field: 'grossMargin', header: 'Marge brute (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'grossMargin') },
  { field: 'marginPct', header: 'Marge (%)', body: (row: Record<string, unknown>) => PCT(row, 'marginPct') },
];

const MarginAnalysisPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getMarginAnalysis(filter));
  const handleFilterChange = (f: ReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  return (
    <ReportLayout
      icon={PieChart}
      title="Analyse des marges"
      subtitle="Marge brute par produit — CA vs coût d'achat"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.PRODUCTS.MARGIN + '/xlsx', filter)} xlsxFilename="marges-produits.xlsx" />}
    />
  );
};

export default MarginAnalysisPage;
