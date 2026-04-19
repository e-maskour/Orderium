import { AlertTriangle } from 'lucide-react';
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
  { field: 'quantity', header: 'Qté actuelle' },
  { field: 'threshold', header: 'Seuil d\'alerte' },
  { field: 'warehouseName', header: 'Entrepôt' },
];

const LowStockPage: React.FC = () => {
  const [filter, setFilter] = useState<StockReportFilter>({});
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getLowStock(filter));
  const handleFilterChange = (f: StockReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  return (
    <ReportLayout
      icon={AlertTriangle}
      title="Stock faible"
      subtitle="Produits sous le seuil d'alerte — réapprovisionner en urgence"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.STOCK.LOW_STOCK + '/xlsx', filter)} xlsxFilename="stock-faible.xlsx" />}
    />
  );
};

export default LowStockPage;
