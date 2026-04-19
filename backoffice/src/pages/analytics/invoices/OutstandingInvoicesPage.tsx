import { AlertCircle } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportKpiCards from '../components/ReportKpiCards';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const COLUMNS = [
  { field: 'invoiceNumber', header: 'N° Facture' },
  { field: 'partnerName', header: 'Client / Fournisseur' },
  { field: 'direction', header: 'Type' },
  { field: 'dueDate', header: 'Échéance' },
  { field: 'amountDue', header: 'Montant dû (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'amountDue') },
  { field: 'daysOverdue', header: 'Jours de retard' },
];

const OutstandingInvoicesPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getOutstandingInvoices(filter));
  const handleFilterChange = (f: ReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  const kpis = data ? [
    { label: 'Total impayé', value: Number(data.kpis.totalDue ?? 0), suffix: 'MAD', color: 'red' as const },
    { label: 'Nb factures', value: Number(data.kpis.count ?? 0), color: 'blue' as const },
  ] : [];

  return (
    <ReportLayout
      icon={AlertCircle}
      title="Factures impayées"
      subtitle="Factures en attente de règlement"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      kpiCards={kpis.length > 0 && <ReportKpiCards cards={kpis} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} total={data?.meta?.total} page={filter.page} perPage={filter.perPage} onPageChange={(p, pp) => handleFilterChange({ ...filter, page: p, perPage: pp })} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.INVOICES.OUTSTANDING + '/xlsx', filter)} xlsxFilename="factures-impayees.xlsx" />}
    />
  );
};

export default OutstandingInvoicesPage;
