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
import { buildPdfSpec, ORDER_STATUS_TONES } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { SalesReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const SalesRevenuePage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<SalesReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSalesRevenue(filter),
  );

  const handleFilterChange = (f: SalesReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'reference', header: t('reference') },
    { field: 'date', header: t('date') },
    { field: 'customer', header: t('customer') },
    {
      field: 'total',
      header: `${t('total')} (MAD)`,
      body: (row: Record<string, unknown>) =>
        Number(row.total).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
    },
    { field: 'status', header: t('status') },
    { field: 'channel', header: t('channel') },
  ];

  const kpis = data
    ? [
        {
          label: t('analyticsSalesRevenueTitle'),
          value: Number(data.kpis.totalRevenue ?? 0),
          suffix: 'MAD',
          color: 'green' as const,
        },
        {
          label: t('analyticsSalesRevenueOrdersCount'),
          value: Number(data.kpis.totalOrders ?? 0),
          color: 'blue' as const,
        },
        {
          label: t('analyticsSalesRevenueAverageBasket'),
          value: Number(data.kpis.avgBasket ?? data.kpis.avgOrder ?? 0),
          suffix: 'MAD',
          color: 'orange' as const,
        },
      ]
    : [];

  return (
    <ReportLayout
      icon={TrendingUp}
      title={t('analyticsSalesRevenueTitle')}
      subtitle={t('analyticsSalesRevenueSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={
        <ReportTable
          columns={columns}
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
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'sales-revenue',
              title: t('analyticsSalesRevenueTitle'),
              subtitle: t('analyticsSalesRevenueSubtitle'),
              fileName: 'ca-ventes',
              landscape: true,
              kpis: [
                {
                  key: 'totalRevenue',
                  label: t('analyticsSalesRevenueTitle'),
                  format: 'currency',
                },
                {
                  key: 'totalOrders',
                  label: t('analyticsSalesRevenueOrdersCount'),
                  format: 'integer',
                },
                {
                  key: 'avgOrder',
                  label: t('analyticsSalesRevenueAverageBasket'),
                  format: 'currency',
                },
              ],
              columns: [
                { key: 'reference', header: t('reference'), emphasis: true },
                { key: 'date', header: t('date'), format: 'date' },
                { key: 'customer', header: t('customer') },
                {
                  key: 'total',
                  header: t('total'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'status',
                  header: t('status'),
                  align: 'center',
                  badgeMap: ORDER_STATUS_TONES,
                },
                { key: 'channel', header: t('channel') },
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

export default SalesRevenuePage;
