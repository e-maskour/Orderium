import { Percent } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) =>
  Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const COLUMNS = [
  { field: 'tvaRate', header: 'Taux TVA (%)' },
  {
    field: 'baseHt',
    header: 'Base HT (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'baseHt'),
  },
  {
    field: 'tvaCollected',
    header: 'TVA collectée',
    body: (row: Record<string, unknown>) => MAD(row, 'tvaCollected'),
  },
  {
    field: 'tvaDeductible',
    header: 'TVA déductible',
    body: (row: Record<string, unknown>) => MAD(row, 'tvaDeductible'),
  },
  {
    field: 'tvaDue',
    header: 'TVA nette due',
    body: (row: Record<string, unknown>) => MAD(row, 'tvaDue'),
  },
];

const TvaSummaryPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getTvaSummary(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  return (
    <ReportLayout
      icon={Percent}
      title="Bilan TVA"
      subtitle="Déclaration TVA par taux — TVA collectée vs déductible"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.INVOICES.TVA_SUMMARY + '/xlsx',
            filter,
          )}
          xlsxFilename="bilan-tva.xlsx"
        />
      }
    />
  );
};

export default TvaSummaryPage;
