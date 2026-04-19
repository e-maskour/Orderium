import { Warehouse } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportChart from '../components/ReportChart';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { StockReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const COLUMNS = [
  { field: 'warehouseName', header: 'Entrepôt' },
  { field: 'skuCount', header: 'Nb références' },
  { field: 'totalQty', header: 'Qté totale' },
  { field: 'availableQty', header: 'Qté disponible' },
];

const StockByWarehousePage: React.FC = () => {
  const [filter, setFilter] = useState<StockReportFilter>({});
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getStockByWarehouse(filter));
  const handleFilterChange = (f: StockReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  return (
    <ReportLayout
      icon={Warehouse}
      title="Stock par entrepôt"
      subtitle="Répartition du stock par dépôt"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.STOCK.BY_WAREHOUSE + '/xlsx', filter)} xlsxFilename="stock-entrepot.xlsx" />}
    />
  );
};

export default StockByWarehousePage;
