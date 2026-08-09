import { Wallet } from 'lucide-react';
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
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) =>
  Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const CashflowPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getCashflow(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'period', header: t('period') },
    {
      field: 'inflow',
      header: `${t('analyticsCashflowInflow')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'inflow'),
    },
    {
      field: 'outflow',
      header: `${t('analyticsCashflowOutflow')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'outflow'),
    },
    {
      field: 'net',
      header: `${t('analyticsCashflowNet')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'net'),
    },
  ];

  return (
    <ReportLayout
      icon={Wallet}
      title={t('analyticsCashflowTitle')}
      subtitle={t('analyticsCashflowSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.PAYMENTS.CASHFLOW + '/xlsx', filter)}
          xlsxFilename="tresorerie.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'payments-cashflow',
              title: t('analyticsCashflowTitle'),
              subtitle: t('analyticsCashflowSubtitle'),
              fileName: 'tresorerie',
              columns: [
                { key: 'period', header: t('period'), emphasis: true },
                {
                  key: 'inflow',
                  header: t('analyticsCashflowInflow'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'outflow',
                  header: t('analyticsCashflowOutflow'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'net',
                  header: t('analyticsCashflowNet'),
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

export default CashflowPage;
