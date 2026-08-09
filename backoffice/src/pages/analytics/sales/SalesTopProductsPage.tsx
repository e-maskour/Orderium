import { Trophy } from 'lucide-react';
import React, { useState } from 'react';
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
import type { SalesReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const SalesTopProductsPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<SalesReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSalesTopProducts(filter),
  );
  const handleFilterChange = (f: SalesReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'productName', header: t('analyticsSalesTopProductsProduct') },
    { field: 'totalQty', header: t('analyticsSalesTopProductsQuantitySold') },
    {
      field: 'totalRevenue',
      header: t('analyticsSalesTopProductsRevenue'),
      body: (row: Record<string, unknown>) =>
        Number(row.totalRevenue).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
    },
  ];

  const kpis = data
    ? [
        {
          label: t('analyticsSalesTopProductsUniqueProducts'),
          value: Number(data.kpis.uniqueProducts ?? 0),
          color: 'blue' as const,
        },
        {
          label: t('analyticsSalesTopProductsTotalQuantity'),
          value: Number(data.kpis.totalQty ?? 0),
          color: 'green' as const,
        },
      ]
    : [];

  return (
    <ReportLayout
      icon={Trophy}
      title={t('analyticsTopProductsTitle')}
      subtitle={t('analyticsTopProductsSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.SALES.TOP_PRODUCTS + '/xlsx',
            filter,
          )}
          xlsxFilename="top-produits.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'sales-top-products',
              title: t('analyticsTopProductsTitle'),
              subtitle: t('analyticsTopProductsSubtitle'),
              fileName: 'top-produits',
              kpis: [
                {
                  key: 'uniqueProducts',
                  label: t('analyticsSalesTopProductsUniqueProducts'),
                  format: 'integer',
                },
                {
                  key: 'totalQty',
                  label: t('analyticsSalesTopProductsTotalQuantity'),
                  format: 'integer',
                },
              ],
              columns: [
                {
                  key: 'productName',
                  header: t('analyticsSalesTopProductsProduct'),
                  emphasis: true,
                },
                {
                  key: 'totalQty',
                  header: t('analyticsSalesTopProductsQuantitySold'),
                  format: 'integer',
                  total: true,
                },
                {
                  key: 'totalRevenue',
                  header: t('analyticsSalesTopProductsRevenue'),
                  format: 'currency',
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

export default SalesTopProductsPage;
