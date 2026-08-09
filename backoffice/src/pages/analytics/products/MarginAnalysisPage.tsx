import { PieChart } from 'lucide-react';
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
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) =>
  Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });
const PCT = (row: Record<string, unknown>, field: string) => Number(row[field]).toFixed(1) + ' %';

const MarginAnalysisPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getMarginAnalysis(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'productName', header: t('analyticsProductPerformanceProduct') },
    { field: 'totalQty', header: t('analyticsMarginQuantitySold') },
    {
      field: 'totalRevenue',
      header: `${t('analyticsMarginRevenue')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'totalRevenue'),
    },
    {
      field: 'totalCost',
      header: `${t('analyticsMarginCost')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'totalCost'),
    },
    {
      field: 'grossMargin',
      header: `${t('analyticsMarginGrossMargin')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'grossMargin'),
    },
    {
      field: 'marginPct',
      header: t('analyticsMarginPercent'),
      body: (row: Record<string, unknown>) => PCT(row, 'marginPct'),
    },
  ];

  return (
    <ReportLayout
      icon={PieChart}
      title={t('analyticsMarginAnalysisTitle')}
      subtitle={t('analyticsMarginAnalysisSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.PRODUCTS.MARGIN + '/xlsx', filter)}
          xlsxFilename="marges-produits.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'products-margin',
              title: t('analyticsMarginAnalysisTitle'),
              subtitle: t('analyticsMarginAnalysisSubtitle'),
              fileName: 'marges-produits',
              landscape: true,
              columns: [
                {
                  key: 'productName',
                  header: t('analyticsProductPerformanceProduct'),
                  emphasis: true,
                },
                {
                  key: 'totalQty',
                  header: t('analyticsMarginQuantitySold'),
                  format: 'number',
                  total: true,
                },
                {
                  key: 'totalRevenue',
                  header: t('analyticsMarginRevenue'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'totalCost',
                  header: t('analyticsMarginCost'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'grossMargin',
                  header: t('analyticsMarginGrossMargin'),
                  format: 'currency',
                  signed: true,
                  emphasis: true,
                  total: true,
                },
                {
                  key: 'marginPct',
                  header: t('analyticsMarginPercent'),
                  format: 'percent',
                  signed: true,
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

export default MarginAnalysisPage;
