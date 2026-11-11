import { Users } from 'lucide-react';
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
import type { SalesReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const SalesByCustomerPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<SalesReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSalesByCustomer(filter),
  );
  const handleFilterChange = (f: SalesReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'customerName', header: t('customer') },
    { field: 'orderCount', header: t('analyticsSalesOrderCount') },
    {
      field: 'totalRevenue',
      header: `${t('analyticsSalesRevenueAmount')} (MAD)`,
      body: (row: Record<string, unknown>) => formatAmount(Number(row.totalRevenue)),
    },
  ];

  return (
    <ReportLayout
      icon={Users}
      title={t('analyticsSalesByCustomerTitle')}
      subtitle={t('analyticsSalesByCustomerSubtitle')}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      kpiCards={data && <ReportKpiCards reportKey="sales-by-customer" values={data.kpis} />}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.SALES.BY_CUSTOMER + '/xlsx', filter)}
          xlsxFilename="ventes-client.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'sales-by-customer',
              title: t('analyticsSalesByCustomerTitle'),
              subtitle: t('analyticsSalesByCustomerSubtitle'),
              fileName: 'ventes-client',
              columns: [
                { key: 'customerName', header: t('customer'), emphasis: true },
                {
                  key: 'orderCount',
                  header: t('analyticsSalesOrderCount'),
                  format: 'integer',
                  total: true,
                },
                {
                  key: 'totalRevenue',
                  header: t('analyticsSalesRevenueAmount'),
                  format: 'currency',
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

export default SalesByCustomerPage;
