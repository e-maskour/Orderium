import { CreditCard } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportChart from '../components/ReportChart';
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

const PaymentsByMethodPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getPaymentsByMethod(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'method', header: t('analyticsPaymentMethod') },
    { field: 'count', header: t('analyticsPaymentTransactionsCount') },
    {
      field: 'total',
      header: `${t('total')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'total'),
    },
  ];

  return (
    <ReportLayout
      icon={CreditCard}
      title={t('analyticsPaymentsByMethodTitle')}
      subtitle={t('analyticsPaymentsByMethodSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      chart={data?.chart ? <ReportChart chart={data.chart} /> : undefined}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.PAYMENTS.BY_METHOD + '/xlsx',
            filter,
          )}
          xlsxFilename="paiements-mode.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'payments-by-method',
              title: t('analyticsPaymentsByMethodTitle'),
              subtitle: t('analyticsPaymentsByMethodSubtitle'),
              fileName: 'paiements-mode',
              columns: [
                {
                  key: 'method',
                  header: t('analyticsPaymentMethod'),
                  emphasis: true,
                },
                {
                  key: 'count',
                  header: t('analyticsPaymentTransactionsCount'),
                  format: 'integer',
                  total: true,
                },
                {
                  key: 'total',
                  header: t('total'),
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

export default PaymentsByMethodPage;
