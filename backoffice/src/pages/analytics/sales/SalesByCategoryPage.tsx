import { LayoutGrid } from 'lucide-react';
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
import type { SalesReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const SalesByCategoryPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<SalesReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSalesByCategory(filter),
  );
  const handleFilterChange = (f: SalesReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'categoryName', header: t('category') },
    { field: 'totalQty', header: t('analyticsSalesQuantitySold') },
    {
      field: 'totalRevenue',
      header: `${t('analyticsSalesRevenueAmount')} (MAD)`,
      body: (row: Record<string, unknown>) =>
        Number(row.totalRevenue).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <ReportLayout
      icon={LayoutGrid}
      title={t('analyticsSalesByCategoryTitle')}
      subtitle={t('analyticsSalesByCategorySubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.SALES.BY_CATEGORY + '/xlsx', filter)}
          xlsxFilename="ventes-categorie.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'sales-by-category',
              title: t('analyticsSalesByCategoryTitle'),
              subtitle: t('analyticsSalesByCategorySubtitle'),
              fileName: 'ventes-categorie',
              columns: [
                { key: 'categoryName', header: t('category'), emphasis: true },
                {
                  key: 'totalQty',
                  header: t('analyticsSalesQuantitySold'),
                  format: 'integer',
                  total: true,
                },
                {
                  key: 'totalRevenue',
                  header: t('analyticsSalesRevenueAmount'),
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

export default SalesByCategoryPage;
