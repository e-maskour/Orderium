import { AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { buildPdfSpec } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { StockReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const LowStockPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<StockReportFilter>({});
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getLowStock(filter),
  );
  const handleFilterChange = (f: StockReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'productName', header: t('analyticsStockProduct') },
    { field: 'sku', header: t('analyticsSku') },
    { field: 'quantity', header: t('analyticsStockCurrentQuantity') },
    { field: 'threshold', header: t('analyticsStockAlertThreshold') },
    { field: 'warehouseName', header: t('analyticsStockWarehouse') },
  ];

  return (
    <ReportLayout
      icon={AlertTriangle}
      title={t('analyticsLowStockTitle')}
      subtitle={t('analyticsLowStockSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.STOCK.LOW_STOCK + '/xlsx', filter)}
          xlsxFilename="stock-faible.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'stock-low-stock',
              title: t('analyticsLowStockTitle'),
              subtitle: t('analyticsLowStockSubtitle'),
              fileName: 'stock-faible',
              columns: [
                {
                  key: 'productName',
                  header: t('analyticsStockProduct'),
                  emphasis: true,
                },
                { key: 'sku', header: t('analyticsSku') },
                {
                  key: 'quantity',
                  header: t('analyticsStockCurrentQuantity'),
                  format: 'number',
                },
                {
                  key: 'threshold',
                  header: t('analyticsStockAlertThreshold'),
                  format: 'number',
                },
                { key: 'warehouseName', header: t('analyticsStockWarehouse') },
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

export default LowStockPage;
