import { Star } from 'lucide-react';
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

const TopClientsPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_year' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getTopClients(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'rank', header: '#' },
    { field: 'customerName', header: t('customer') },
    { field: 'orderCount', header: t('analyticsTopClientsOrderCount') },
    {
      field: 'totalRevenue',
      header: `${t('analyticsTopClientsRevenue')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'totalRevenue'),
    },
    { field: 'lastOrderDate', header: t('analyticsTopClientsLastOrderDate') },
  ];

  return (
    <ReportLayout
      icon={Star}
      title={t('analyticsTopClientsTitle')}
      subtitle={t('analyticsTopClientsSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.CLIENTS.TOP + '/xlsx', filter)}
          xlsxFilename="top-clients.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'clients-top',
              title: t('analyticsTopClientsTitle'),
              subtitle: t('analyticsTopClientsSubtitle'),
              fileName: 'top-clients',
              columns: [
                { key: 'rank', header: '#', align: 'center', width: '6%' },
                { key: 'customerName', header: t('customer'), emphasis: true },
                {
                  key: 'orderCount',
                  header: t('analyticsTopClientsOrderCount'),
                  format: 'integer',
                  total: true,
                },
                {
                  key: 'totalRevenue',
                  header: t('analyticsTopClientsRevenue'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'lastOrderDate',
                  header: t('analyticsTopClientsLastOrderDate'),
                  format: 'date',
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

export default TopClientsPage;
