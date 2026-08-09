import { AlertCircle } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportKpiCards from '../components/ReportKpiCards';
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

const OutstandingInvoicesPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getOutstandingInvoices(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'invoiceNumber', header: t('analyticsOutstandingInvoicesInvoiceNumber') },
    { field: 'partnerName', header: t('analyticsOutstandingInvoicesPartner') },
    { field: 'direction', header: t('analyticsOutstandingInvoicesType') },
    { field: 'dueDate', header: t('analyticsOutstandingInvoicesDueDate') },
    {
      field: 'amountDue',
      header: t('analyticsOutstandingInvoicesAmountDue'),
      body: (row: Record<string, unknown>) => MAD(row, 'amountDue'),
    },
    { field: 'daysOverdue', header: t('analyticsOutstandingInvoicesDaysOverdue') },
  ];

  const kpis = data
    ? [
        {
          label: t('analyticsOutstandingInvoicesTotalDue'),
          value: Number(data.kpis.totalDue ?? 0),
          suffix: 'MAD',
          color: 'red' as const,
        },
        {
          label: t('analyticsOutstandingInvoicesInvoiceCount'),
          value: Number(data.kpis.count ?? 0),
          color: 'blue' as const,
        },
      ]
    : [];

  return (
    <ReportLayout
      icon={AlertCircle}
      title={t('analyticsOutstandingInvoicesTitle')}
      subtitle={t('analyticsOutstandingInvoicesSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
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
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.INVOICES.OUTSTANDING + '/xlsx',
            filter,
          )}
          xlsxFilename="factures-impayees.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'invoices-outstanding',
              title: t('analyticsOutstandingInvoicesTitle'),
              subtitle: t('analyticsOutstandingInvoicesSubtitle'),
              fileName: 'factures-impayees',
              landscape: true,
              kpis: [
                {
                  key: 'totalDue',
                  label: t('analyticsOutstandingInvoicesTotalDue'),
                  format: 'currency',
                },
                {
                  key: 'count',
                  label: t('analyticsOutstandingInvoicesInvoiceCount'),
                  format: 'integer',
                },
              ],
              columns: [
                {
                  key: 'invoiceNumber',
                  header: t('analyticsOutstandingInvoicesInvoiceNumber'),
                  emphasis: true,
                },
                {
                  key: 'partnerName',
                  header: t('analyticsOutstandingInvoicesPartner'),
                },
                {
                  key: 'direction',
                  header: t('analyticsOutstandingInvoicesType'),
                  align: 'center',
                },
                {
                  key: 'dueDate',
                  header: t('analyticsOutstandingInvoicesDueDate'),
                  format: 'date',
                },
                {
                  key: 'amountDue',
                  header: t('analyticsOutstandingInvoicesAmountDue'),
                  format: 'currency',
                  emphasis: true,
                  total: true,
                },
                {
                  key: 'daysOverdue',
                  header: t('analyticsOutstandingInvoicesDaysOverdue'),
                  format: 'integer',
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

export default OutstandingInvoicesPage;
