import { DollarSign } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportKpiCards from '../components/ReportKpiCards';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { StockReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const COLUMNS = [
  { field: 'productName', header: 'Produit' },
  { field: 'sku', header: 'SKU' },
  { field: 'quantity', header: 'Qté en stock' },
  { field: 'cost', header: 'Coût unitaire (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'cost') },
  { field: 'totalValue', header: 'Valeur totale (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'totalValue') },
];

const StockValuationPage: React.FC = () => {
  const [filter, setFilter] = useState<StockReportFilter>({});
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getStockValuation(filter));
  const handleFilterChange = (f: StockReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  const kpis = data ? [
    { label: 'Valeur totale du stock', value: Number(data.kpis.totalValuation ?? 0), suffix: 'MAD', color: 'blue' as const },
    { label: 'Nb références', value: Number(data.kpis.productCount ?? 0), color: 'green' as const },
  ] : [];

  return (
    <ReportLayout
      icon={DollarSign}
      title="Valorisation du stock"
      subtitle="Valeur totale du stock par produit"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.STOCK.VALUATION + '/xlsx', filter)} xlsxFilename="valorisation-stock.xlsx" />}
    />
  );
};

export default StockValuationPage;
