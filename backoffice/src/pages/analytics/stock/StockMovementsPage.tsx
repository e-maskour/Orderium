import { ArrowUpDown } from 'lucide-react';
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
  { field: 'date', header: 'Date' },
  { field: 'reference', header: 'Référence' },
  { field: 'productName', header: 'Produit' },
  { field: 'movementType', header: 'Type' },
  { field: 'quantity', header: 'Quantité' },
  { field: 'sourceWarehouse', header: 'Source' },
  { field: 'destWarehouse', header: 'Destination' },
];

const StockMovementsPage: React.FC = () => {
  const [filter, setFilter] = useState<StockReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getStockMovements(filter));
  const handleFilterChange = (f: StockReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  return (
    <ReportLayout
      icon={ArrowUpDown}
      title="Journal des mouvements"
      subtitle="Historique entrées / sorties / transferts de stock"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} total={data?.meta?.total} page={filter.page} perPage={filter.perPage} onPageChange={(p, pp) => handleFilterChange({ ...filter, page: p, perPage: pp })} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.STOCK.MOVEMENTS + '/xlsx', filter)} xlsxFilename="mouvements-stock.xlsx" />}
    />
  );
};

export default StockMovementsPage;
