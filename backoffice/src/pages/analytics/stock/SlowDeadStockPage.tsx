import { Hourglass } from 'lucide-react';
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

const SlowDeadStockPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<StockReportFilter>({});
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSlowDeadStock(filter),
  );
  const handleFilterChange = (f: StockReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'productName', header: t('analyticsStockProduct') },
    { field: 'sku', header: t('analyticsSku') },
    { field: 'quantity', header: t('analyticsStockQuantityInStock') },
    {
      field: 'immobilisedValue',
      header: `${t('analyticsStockImmobilizedValue')} (MAD)`,
      body: (row: Record<string, unknown>) =>
        Number(row.immobilisedValue).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <ReportLayout
      icon={Hourglass}
      title={t('analyticsSlowDeadStockTitle')}
      subtitle={t('analyticsSlowDeadStockSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.STOCK.SLOW_DEAD + '/xlsx', filter)}
          xlsxFilename="stock-dormant.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'stock-slow-dead',
              title: t('analyticsSlowDeadStockTitle'),
              subtitle: t('analyticsSlowDeadStockSubtitle'),
              fileName: 'stock-dormant',
              columns: [
                {
                  key: 'productName',
                  header: t('analyticsStockProduct'),
                  emphasis: true,
                },
                { key: 'sku', header: t('analyticsSku') },
                {
                  key: 'quantity',
                  header: t('analyticsStockQuantityInStock'),
                  format: 'number',
                  total: true,
                },
                {
                  key: 'immobilisedValue',
                  header: t('analyticsStockImmobilizedValue'),
                  format: 'currency',
                  emphasis: true,
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

export default SlowDeadStockPage;
