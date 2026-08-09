import { Percent } from 'lucide-react';
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
    { field: 'tvaRate', header: t('analyticsTvaRate') },
    {
      field: 'baseHt',
      header: `${t('analyticsBaseHt')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'baseHt'),
    },
    {
      field: 'collectedTva',
      header: t('analyticsCollectedTva'),
      body: (row: Record<string, unknown>) => MAD(row, 'collectedTva'),
    },
    {
      field: 'deductibleTva',
      header: t('analyticsDeductibleTva'),
      body: (row: Record<string, unknown>) => MAD(row, 'deductibleTva'),
    },
    {
      field: 'netDue',
      header: t('analyticsNetDueTva'),
      body: (row: Record<string, unknown>) => MAD(row, 'netDue'),
    },
  ];

  return (
    <ReportLayout
      icon={Percent}
      title={t('analyticsTvaSummaryTitle')}
      subtitle={t('analyticsTvaSummarySubtitle')}
      isLoading={isLoading}
      error={error}
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
                  header: t('analyticsBaseHt'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'collectedTva',
                  header: t('analyticsCollectedTva'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'deductibleTva',
                  header: t('analyticsDeductibleTva'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'netDue',
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
