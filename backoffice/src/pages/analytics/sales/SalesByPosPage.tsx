import { Store } from 'lucide-react';
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
import type { SalesReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const SalesByPosPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<SalesReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSalesByPos(filter),
  );
  const handleFilterChange = (f: SalesReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'channel', header: t('analyticsSalesByPosChannel') },
    { field: 'orderCount', header: t('analyticsSalesOrderCount') },
    {
      field: 'totalRevenue',
      header: `${t('analyticsSalesRevenueAmount')} (MAD)`,
      body: (row: Record<string, unknown>) =>
        Number(row.totalRevenue).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <ReportLayout
      icon={Store}
      title={t('analyticsSalesByPosTitle')}
      subtitle={t('analyticsSalesByPosSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.SALES.BY_POS + '/xlsx', filter)}
          xlsxFilename="ventes-caisse.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'sales-by-pos',
              title: t('analyticsSalesByPosTitle'),
              subtitle: t('analyticsSalesByPosSubtitle'),
              fileName: 'ventes-caisse',
              columns: [
                {
                  key: 'channel',
                  header: t('analyticsSalesByPosChannel'),
                  emphasis: true,
                },
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

export default SalesByPosPage;
