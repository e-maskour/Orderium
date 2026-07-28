import { Wallet } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
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
    header: 'Encaissements (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'inflow'),
  },
  {
    field: 'outflow',
    header: 'Décaissements (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'outflow'),
  },
  { field: 'net', header: 'Net (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'net') },
];

const CashflowPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getCashflow(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  return (
    <ReportLayout
      icon={Wallet}
      title="Flux de trésorerie"
      subtitle="Entrées et sorties cumulées par période"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.PAYMENTS.CASHFLOW + '/xlsx', filter)}
          xlsxFilename="tresorerie.xlsx"
        />
      }
    />
  );
};

export default CashflowPage;
