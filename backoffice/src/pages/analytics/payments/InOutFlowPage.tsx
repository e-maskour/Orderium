import { ArrowLeftRight } from 'lucide-react';
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
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) =>
  Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const InOutFlowPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getInOutFlow(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'period', header: t('analyticsInOutFlowPeriod') },
    {
      field: 'inflow',
      header: t('analyticsInOutFlowInflow'),
      body: (row: Record<string, unknown>) => MAD(row, 'inflow'),
    },
    {
      field: 'outflow',
      header: t('analyticsInOutFlowOutflow'),
      body: (row: Record<string, unknown>) => MAD(row, 'outflow'),
    },
    {
      field: 'net',
      header: t('analyticsInOutFlowNet'),
      body: (row: Record<string, unknown>) => MAD(row, 'net'),
    },
  ];

  const kpis = data
    ? [
        {
          label: t('analyticsInOutFlowTotalInflow'),
          value: Number(data.kpis.totalInflow ?? 0),
          suffix: 'MAD',
          color: 'green' as const,
        },
        {
          label: t('analyticsInOutFlowTotalOutflow'),
          value: Number(data.kpis.totalOutflow ?? 0),
          suffix: 'MAD',
          color: 'red' as const,
        },
        {
          label: t('analyticsInOutFlowNetBalance'),
          value: Number(data.kpis.net ?? 0),
          suffix: 'MAD',
          color: 'blue' as const,
        },
      ]
    : [];

  return (
    <ReportLayout
      icon={ArrowLeftRight}
      title={t('analyticsInOutFlowTitle')}
      subtitle={t('analyticsInOutFlowSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.PAYMENTS.IN_OUT + '/xlsx', filter)}
          xlsxFilename="entrees-sorties.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'payments-in-out',
              title: t('analyticsInOutFlowTitle'),
              subtitle: t('analyticsInOutFlowSubtitle'),
              fileName: 'entrees-sorties',
              kpis: [
                {
                  key: 'totalInflow',
                  label: t('analyticsInOutFlowTotalInflow'),
                  format: 'currency',
                },
                {
                  key: 'totalOutflow',
                  label: t('analyticsInOutFlowTotalOutflow'),
                  format: 'currency',
                },
                {
                  key: 'net',
                  label: t('analyticsInOutFlowNetBalance'),
                  format: 'currency',
                },
              ],
              columns: [
                {
                  key: 'period',
                  header: t('analyticsInOutFlowPeriod'),
                  emphasis: true,
                },
                {
                  key: 'inflow',
                  header: t('analyticsInOutFlowInflow'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'outflow',
                  header: t('analyticsInOutFlowOutflow'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'net',
                  header: t('analyticsInOutFlowNet'),
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

export default InOutFlowPage;
