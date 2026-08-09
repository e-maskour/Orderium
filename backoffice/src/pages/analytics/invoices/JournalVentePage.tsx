import { FileText } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { buildPdfSpec, INVOICE_STATUS_TONES } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) =>
  Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const JournalVentePage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getJournalVente(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'invoiceDate', header: t('date') },
    { field: 'invoiceNumber', header: t('analyticsJournalInvoiceNumber') },
    { field: 'customerName', header: t('customer') },
    {
      field: 'ht',
      header: `${t('analyticsJournalHt')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'ht'),
    },
    {
      field: 'tva',
      header: `${t('analyticsJournalTva')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'tva'),
    },
    {
      field: 'ttc',
      header: `${t('analyticsJournalTtc')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'ttc'),
    },
    { field: 'status', header: t('status') },
  ];

  return (
    <ReportLayout
      icon={FileText}
      title={t('analyticsInvoicesJournalVenteTitle')}
      subtitle={t('analyticsInvoicesJournalVenteSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
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
            API_ROUTES.REPORTS.INVOICES.JOURNAL_VENTE + '/xlsx',
            filter,
          )}
          xlsxFilename="journal-vente.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'invoices-journal-vente',
              title: t('analyticsInvoicesJournalVenteTitle'),
              subtitle: t('analyticsInvoicesJournalVenteSubtitle'),
              fileName: 'journal-vente',
              landscape: true,
              columns: [
                { key: 'invoiceDate', header: t('date'), format: 'date' },
                {
                  key: 'invoiceNumber',
                  header: t('analyticsJournalInvoiceNumber'),
                  emphasis: true,
                },
                { key: 'customerName', header: t('customer') },
                {
                  key: 'ht',
                  header: t('analyticsJournalHt'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'tva',
                  header: t('analyticsJournalTva'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'ttc',
                  header: t('analyticsJournalTtc'),
                  format: 'currency',
                  emphasis: true,
                  total: true,
                },
                {
                  key: 'status',
                  header: t('status'),
                  align: 'center',
                  badgeMap: INVOICE_STATUS_TONES,
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

export default JournalVentePage;
