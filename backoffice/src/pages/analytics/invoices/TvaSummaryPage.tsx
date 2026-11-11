import { Percent } from 'lucide-react';
import React, { useState } from 'react';
import { formatAmount } from '@orderium/ui';
import ReportLayout from '../components/ReportLayout';
import ReportKpiCards from '../components/ReportKpiCards';
import ReportChart from '../components/ReportChart';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { buildPdfSpec } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => formatAmount(Number(row[field]));

const TvaSummaryPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getTvaSummary(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    {
      field: 'tvaRate',
      header: t('analyticsTvaRate'),
      body: (row: Record<string, unknown>) => `${formatAmount(Number(row.tvaRate), 0)} %`,
    },
    {
      field: 'baseHt',
      header: `${t('analyticsSalesHt')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'baseHt'),
    },
    {
      field: 'achatHT',
      header: `${t('analyticsPurchasesHt')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'achatHT'),
    },
    {
      field: 'tvaCollected',
      header: t('analyticsCollectedTva'),
      body: (row: Record<string, unknown>) => MAD(row, 'tvaCollected'),
    },
    {
      field: 'tvaDeductible',
      header: t('analyticsDeductibleTva'),
      body: (row: Record<string, unknown>) => MAD(row, 'tvaDeductible'),
    },
    {
      field: 'tvaDue',
      header: t('analyticsNetDueTva'),
      body: (row: Record<string, unknown>) => MAD(row, 'tvaDue'),
    },
  ];

  return (
    <ReportLayout
      icon={Percent}
      title={t('analyticsTvaSummaryTitle')}
      subtitle={t('analyticsTvaSummarySubtitle')}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      kpiCards={data && <ReportKpiCards reportKey="invoices-tva-summary" values={data.kpis} />}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.INVOICES.TVA_SUMMARY + '/xlsx',
            filter,
          )}
          xlsxFilename="bilan-tva.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'invoices-tva-summary',
              title: t('analyticsTvaSummaryTitle'),
              subtitle: t('analyticsTvaSummarySubtitle'),
              fileName: 'bilan-tva',
              columns: [
                {
                  key: 'tvaRate',
                  header: t('analyticsTvaRate'),
                  align: 'center',
                  emphasis: true,
                },
                {
                  key: 'baseHt',
                  header: t('analyticsSalesHt'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'achatHT',
                  header: t('analyticsPurchasesHt'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'tvaCollected',
                  header: t('analyticsCollectedTva'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'tvaDeductible',
                  header: t('analyticsDeductibleTva'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'tvaDue',
                  header: t('analyticsNetDueTva'),
                  format: 'currency',
                  signed: true,
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

export default TvaSummaryPage;
