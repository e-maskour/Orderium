import { Warehouse } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportChart from '../components/ReportChart';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { buildPdfSpec } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { StockReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const StockByWarehousePage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<StockReportFilter>({});
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getStockByWarehouse(filter),
  );
  const handleFilterChange = (f: StockReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'warehouseName', header: t('analyticsStockWarehouse') },
    { field: 'skuCount', header: t('analyticsStockReferenceCount') },
    { field: 'totalQty', header: t('analyticsStockTotalQuantity') },
    { field: 'availableQty', header: t('analyticsStockAvailableQuantity') },
  ];

  return (
    <ReportLayout
      icon={Warehouse}
      title={t('analyticsStockByWarehouseTitle')}
      subtitle={t('analyticsStockByWarehouseSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.STOCK.BY_WAREHOUSE + '/xlsx',
            filter,
          )}
          xlsxFilename="stock-entrepot.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'stock-by-warehouse',
              title: t('analyticsStockByWarehouseTitle'),
              subtitle: t('analyticsStockByWarehouseSubtitle'),
              fileName: 'stock-entrepot',
              columns: [
                {
                  key: 'warehouseName',
                  header: t('analyticsStockWarehouse'),
                  emphasis: true,
                },
                {
                  key: 'skuCount',
                  header: t('analyticsStockReferenceCount'),
                  format: 'integer',
                  total: true,
                },
                {
                  key: 'totalQty',
                  header: t('analyticsStockTotalQuantity'),
                  format: 'number',
                  total: true,
                },
                {
                  key: 'availableQty',
                  header: t('analyticsStockAvailableQuantity'),
                  format: 'number',
                  total: true,
                },
              ],
            },
            filter,
            t,
          )}
        />
      }
    />
  );
};

export default StockByWarehousePage;
