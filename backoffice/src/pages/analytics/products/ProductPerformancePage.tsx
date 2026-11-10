import { BarChart2 } from 'lucide-react';
import React, { useState } from 'react';
import { formatAmount } from '@orderium/ui';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportKpiCards from '../components/ReportKpiCards';
import ReportChart from '../components/ReportChart';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { buildPdfSpec } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => formatAmount(Number(row[field]));

const ProductPerformancePage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getProductPerformance(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'productName', header: t('analyticsProductPerformanceProduct') },
    { field: 'totalQty', header: t('analyticsProductPerformanceQuantitySold') },
    {
      field: 'totalRevenue',
      header: t('analyticsProductPerformanceRevenue'),
      body: (row: Record<string, unknown>) => MAD(row, 'totalRevenue'),
    },
    { field: 'orderCount', header: t('analyticsProductPerformanceOrderCount') },
  ];

  return (
    <ReportLayout
      icon={BarChart2}
      title={t('analyticsProductPerformanceTitle')}
      subtitle={t('analyticsProductPerformanceSubtitle')}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      kpiCards={data && <ReportKpiCards reportKey="products-performance" values={data.kpis} />}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.PRODUCTS.PERFORMANCE + '/xlsx',
            filter,
          )}
          xlsxFilename="performance-produits.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'products-performance',
              title: t('analyticsProductPerformanceTitle'),
              subtitle: t('analyticsProductPerformanceSubtitle'),
              fileName: 'performance-produits',
              columns: [
                {
                  key: 'productName',
                  header: t('analyticsProductPerformanceProduct'),
                  emphasis: true,
                },
                {
                  key: 'totalQty',
                  header: t('analyticsProductPerformanceQuantitySold'),
                  format: 'number',
                  total: true,
                },
                {
                  key: 'totalRevenue',
                  header: t('analyticsProductPerformanceRevenue'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'orderCount',
                  header: t('analyticsProductPerformanceOrderCount'),
                  format: 'integer',
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

export default ProductPerformancePage;
