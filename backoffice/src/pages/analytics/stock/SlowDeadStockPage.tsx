import { Hourglass } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { StockReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const COLUMNS = [
  { field: 'productName', header: 'Produit' },
  { field: 'sku', header: 'SKU' },
  { field: 'quantity', header: 'Qté en stock' },
  { field: 'immobilisedValue', header: 'Valeur immobilisée (MAD)', body: (row: Record<string, unknown>) => Number(row.immobilisedValue).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) },
];

const SlowDeadStockPage: React.FC = () => {
  const [filter, setFilter] = useState<StockReportFilter>({});
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getSlowDeadStock(filter));
  const handleFilterChange = (f: StockReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  return (
    <ReportLayout
      icon={Hourglass}
      title="Stock dormant"
      subtitle="Produits sans mouvement depuis plus de 90 jours"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.STOCK.SLOW_DEAD + '/xlsx', filter)} xlsxFilename="stock-dormant.xlsx" />}
    />
  );
};

export default SlowDeadStockPage;
