import { UserX } from 'lucide-react';
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

const InactiveClientsPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_year' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getInactiveClients(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'customerName', header: t('customer') },
    { field: 'lastOrderDate', header: t('lastOrderDate') },
    { field: 'daysSinceLastOrder', header: t('analyticsInactiveClientsInactiveDays') },
    { field: 'totalOrders', header: t('analyticsInactiveClientsTotalOrders') },
  ];

  return (
    <ReportLayout
      icon={UserX}
      title={t('analyticsInactiveClientsTitle')}
      subtitle={t('analyticsInactiveClientsSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.CLIENTS.INACTIVE + '/xlsx', filter)}
          xlsxFilename="clients-inactifs.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'clients-inactive',
              title: t('analyticsInactiveClientsTitle'),
              subtitle: t('analyticsInactiveClientsSubtitle'),
              fileName: 'clients-inactifs',
              columns: [
                { key: 'customerName', header: t('customer'), emphasis: true },
                {
                  key: 'lastOrderDate',
                  header: t('lastOrderDate'),
                  format: 'date',
                },
                {
                  key: 'daysSinceLastOrder',
                  header: t('analyticsInactiveClientsInactiveDays'),
                  format: 'integer',
                },
                {
                  key: 'totalOrders',
                  header: t('analyticsInactiveClientsTotalOrders'),
                  format: 'integer',
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

export default InactiveClientsPage;
