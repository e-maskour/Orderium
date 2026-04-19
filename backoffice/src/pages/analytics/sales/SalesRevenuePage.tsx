import { TrendingUp } from 'lucide-react';
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
import type { SalesReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const COLUMNS = [
  { field: 'reference', header: 'Référence' },
  { field: 'date', header: 'Date' },
  { field: 'customer', header: 'Client' },
  {
    field: 'total',
    header: 'Total (MAD)',
    body: (row: Record<string, unknown>) =>
      Number(row.total).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
  },
  { field: 'status', header: 'Statut' },
  { field: 'channel', header: 'Canal' },
];

const SalesRevenuePage: React.FC = () => {
  const [filter, setFilter] = useState<SalesReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSalesRevenue(filter),
  );

  const handleFilterChange = (f: SalesReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const kpis = data
    ? [
        {
          label: "Chiffre d'affaires",
          value: Number(data.kpis.totalRevenue ?? 0),
          suffix: 'MAD',
          color: 'green' as const,
        },
        {
          label: 'Nb commandes',
          value: Number(data.kpis.totalOrders ?? 0),
          color: 'blue' as const,
        },
        {
          label: 'Panier moyen',
          value: Number(data.kpis.avgBasket ?? data.kpis.avgOrder ?? 0),
          suffix: 'MAD',
          color: 'orange' as const,
        },
      ]
    : [];

  return (
    <ReportLayout
      icon={TrendingUp}
      title="Chiffre d'affaires"
      subtitle="Évolution du revenu par période"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={
        <ReportTable
          columns={COLUMNS}
          rows={data?.rows ?? []}
          total={data?.meta?.total}
          page={filter.page}
          perPage={filter.perPage}
          onPageChange={(p, pp) => handleFilterChange({ ...filter, page: p, perPage: pp })}
          loading={isLoading}
        />
      }
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.SALES.REVENUE + '/xlsx', filter)}
          xlsxFilename="ca-ventes.xlsx"
        />
      }
    />
  );
};

export default SalesRevenuePage;
