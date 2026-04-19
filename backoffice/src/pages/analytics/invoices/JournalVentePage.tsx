import { FileText } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const COLUMNS = [
  { field: 'invoiceDate', header: 'Date' },
  { field: 'invoiceNumber', header: 'N° Facture' },
  { field: 'customerName', header: 'Client' },
  { field: 'ht', header: 'HT (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'ht') },
  { field: 'tva', header: 'TVA (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'tva') },
  { field: 'ttc', header: 'TTC (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'ttc') },
  { field: 'status', header: 'Statut' },
];

const JournalVentePage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getJournalVente(filter));
  const handleFilterChange = (f: ReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  return (
    <ReportLayout
      icon={FileText}
      title="Journal de vente"
      subtitle="Toutes les factures clients"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} total={data?.meta?.total} page={filter.page} perPage={filter.perPage} onPageChange={(p, pp) => handleFilterChange({ ...filter, page: p, perPage: pp })} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.INVOICES.JOURNAL_VENTE + '/xlsx', filter)} xlsxFilename="journal-vente.xlsx" />}
    />
  );
};

export default JournalVentePage;
