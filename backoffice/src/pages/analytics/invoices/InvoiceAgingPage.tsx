import { Clock } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { buildPdfSpec } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { AgingReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) =>
  Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const InvoiceAgingPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter] = useState<AgingReportFilter>({});
  const { data, isLoading, error } = useReport<ReportData>(() =>
    analyticsService.getInvoiceAging(filter),
  );

  const columns = [
    { field: 'partnerName', header: t('analyticsInvoiceAgingPartner') },
    {
      field: 'current',
      header: t('analyticsAgingCurrent'),
      body: (row: Record<string, unknown>) => MAD(row, 'current'),
    },
    {
      field: 'days1_30',
      header: t('analyticsAging1To30'),
      body: (row: Record<string, unknown>) => MAD(row, 'days1_30'),
    },
    {
      field: 'days31_60',
      header: t('analyticsAging31To60'),
      body: (row: Record<string, unknown>) => MAD(row, 'days31_60'),
    },
    {
      field: 'days61_90',
      header: t('analyticsAging61To90'),
      body: (row: Record<string, unknown>) => MAD(row, 'days61_90'),
    },
    {
      field: 'over90',
      header: t('analyticsAgingOver90'),
      body: (row: Record<string, unknown>) => MAD(row, 'over90'),
    },
    {
      field: 'total',
      header: `${t('total')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'total'),
    },
  ];

  return (
    <ReportLayout
      icon={Clock}
      title={t('analyticsInvoiceAgingTitle')}
      subtitle={t('analyticsInvoiceAgingSubtitle')}
      isLoading={isLoading}
      error={error}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={API_ROUTES.REPORTS.INVOICES.AGING + '/xlsx'}
          xlsxFilename="balance-agee.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'invoices-aging',
              title: t('analyticsInvoiceAgingTitle'),
              subtitle: t('analyticsInvoiceAgingSubtitle'),
              fileName: 'balance-agee',
              landscape: true,
              columns: [
                {
                  key: 'partnerName',
                  header: t('analyticsInvoiceAgingPartner'),
                  emphasis: true,
                },
                {
                  key: 'current',
                  header: t('analyticsAgingCurrent'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'days1_30',
                  header: t('analyticsAging1To30'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'days31_60',
                  header: t('analyticsAging31To60'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'days61_90',
                  header: t('analyticsAging61To90'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'over90',
                  header: t('analyticsAgingOver90'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'total',
                  header: t('total'),
                  format: 'currency',
                  emphasis: true,
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

export default InvoiceAgingPage;
