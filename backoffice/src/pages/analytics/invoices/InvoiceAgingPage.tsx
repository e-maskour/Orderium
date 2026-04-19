import { Clock } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { AgingReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const COLUMNS = [
  { field: 'partnerName', header: 'Client / Fournisseur' },
  { field: 'current', header: 'En cours', body: (row: Record<string, unknown>) => MAD(row, 'current') },
  { field: 'days1_30', header: '1–30 jours', body: (row: Record<string, unknown>) => MAD(row, 'days1_30') },
  { field: 'days31_60', header: '31–60 jours', body: (row: Record<string, unknown>) => MAD(row, 'days31_60') },
  { field: 'days61_90', header: '61–90 jours', body: (row: Record<string, unknown>) => MAD(row, 'days61_90') },
  { field: 'over90', header: '+90 jours', body: (row: Record<string, unknown>) => MAD(row, 'over90') },
  { field: 'total', header: 'Total (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'total') },
];

const InvoiceAgingPage: React.FC = () => {
  const [filter] = useState<AgingReportFilter>({});
  const { data, isLoading, error } = useReport<ReportData>(() => analyticsService.getInvoiceAging(filter));

  return (
    <ReportLayout
      icon={Clock}
      title="Balance âgée"
      subtitle="Retards de paiement par tranche d'ancienneté"
      isLoading={isLoading}
      error={error}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={API_ROUTES.REPORTS.INVOICES.AGING + '/xlsx'} xlsxFilename="balance-agee.xlsx" />}
    />
  );
};

export default InvoiceAgingPage;
