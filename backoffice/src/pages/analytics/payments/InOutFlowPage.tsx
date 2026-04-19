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
import { API_ROUTES } from '../../../common/api/api-routes';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) =>
  Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const COLUMNS = [
  { field: 'period', header: 'Période' },
  {
    field: 'inflow',
    header: 'Entrées (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'inflow'),
  },
  {
    field: 'outflow',
    header: 'Sorties (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'outflow'),
  },
  {
    field: 'net',
    header: 'Solde net (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'net'),
  },
];

const InOutFlowPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getInOutFlow(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const kpis = data
    ? [
        {
          label: 'Total entrées',
          value: Number(data.kpis.totalInflow ?? 0),
          suffix: 'MAD',
          color: 'green' as const,
        },
        {
          label: 'Total sorties',
          value: Number(data.kpis.totalOutflow ?? 0),
          suffix: 'MAD',
          color: 'red' as const,
        },
        {
          label: 'Solde net',
          value: Number(data.kpis.net ?? 0),
          suffix: 'MAD',
          color: 'blue' as const,
        },
      ]
    : [];

  return (
    <ReportLayout
      icon={ArrowLeftRight}
      title="Entrées vs Sorties"
      subtitle="Comparaison encaissements et décaissements"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.PAYMENTS.IN_OUT + '/xlsx', filter)}
          xlsxFilename="entrees-sorties.xlsx"
        />
      }
    />
  );
};

export default InOutFlowPage;
