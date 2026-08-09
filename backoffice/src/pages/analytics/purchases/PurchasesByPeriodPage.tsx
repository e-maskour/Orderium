import { ShoppingCart } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportChart from '../components/ReportChart';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { buildPdfSpec, ORDER_STATUS_TONES } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const PurchasesByPeriodPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getPurchasesByPeriod(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'reference', header: t('reference') },
    { field: 'date', header: t('date') },
    { field: 'supplier', header: t('supplier') },
    {
      field: 'total',
      header: `${t('analyticsPurchasesAmount')} (MAD)`,
      body: (row: Record<string, unknown>) =>
        Number(row.total).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
    },
    { field: 'status', header: t('status') },
  ];

  return (
    <ReportLayout
      icon={ShoppingCart}
      title={t('analyticsPurchasesByPeriodTitle')}
      subtitle={t('analyticsPurchasesByPeriodSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.PURCHASES.BY_PERIOD + '/xlsx',
            filter,
          )}
          xlsxFilename="achats-periode.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'purchases-by-period',
              title: t('analyticsPurchasesByPeriodTitle'),
              subtitle: t('analyticsPurchasesByPeriodSubtitle'),
              fileName: 'achats-periode',
              columns: [
                { key: 'reference', header: t('reference'), emphasis: true },
                { key: 'date', header: t('date'), format: 'date' },
                { key: 'supplier', header: t('supplier') },
                {
                  key: 'total',
                  header: t('analyticsPurchasesAmount'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'status',
                  header: t('status'),
                  align: 'center',
                  badgeMap: ORDER_STATUS_TONES,
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

export default PurchasesByPeriodPage;
