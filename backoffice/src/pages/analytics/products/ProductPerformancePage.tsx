import { BarChart2 } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportKpiCards from '../components/ReportKpiCards';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { buildPdfSpec } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) =>
  Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

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

  const kpis = data
    ? [
        {
          label: t('analyticsProductPerformanceSoldProducts'),
          value: Number(data.kpis.uniqueProducts ?? 0),
          color: 'blue' as const,
        },
        {
          label: t('analyticsProductPerformanceTotalRevenue'),
          value: Number(data.kpis.totalRevenue ?? 0),
          suffix: 'MAD',
          color: 'green' as const,
        },
      ]
    : [];

  return (
    <ReportLayout
      icon={BarChart2}
      title={t('analyticsProductPerformanceTitle')}
      subtitle={t('analyticsProductPerformanceSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
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
              kpis: [
                {
                  key: 'uniqueProducts',
                  label: t('analyticsProductPerformanceSoldProducts'),
                  format: 'integer',
                },
                {
                  key: 'totalRevenue',
                  label: t('analyticsProductPerformanceTotalRevenue'),
                  format: 'currency',
                },
              ],
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
