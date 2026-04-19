import { Timer } from 'lucide-react';
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
  { field: 'supplierName', header: 'Fournisseur' },
  { field: 'current', header: 'En cours', body: (row: Record<string, unknown>) => MAD(row, 'current') },
  { field: 'days1_30', header: '1–30 jours', body: (row: Record<string, unknown>) => MAD(row, 'days1_30') },
  { field: 'days31_60', header: '31–60 jours', body: (row: Record<string, unknown>) => MAD(row, 'days31_60') },
  { field: 'days61_90', header: '61–90 jours', body: (row: Record<string, unknown>) => MAD(row, 'days61_90') },
  { field: 'over90', header: '+90 jours', body: (row: Record<string, unknown>) => MAD(row, 'over90') },
  { field: 'total', header: 'Total (MAD)', body: (row: Record<string, unknown>) => MAD(row, 'total') },
];

const SupplierAgingPage: React.FC = () => {
  const [filter] = useState<AgingReportFilter>({});
  const { data, isLoading, error } = useReport<ReportData>(() => analyticsService.getSupplierAging(filter));

  return (
    <ReportLayout
      icon={Timer}
      title="Balance âgée fournisseurs"
      subtitle="Dettes fournisseurs par ancienneté"
      isLoading={isLoading}
      error={error}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={API_ROUTES.REPORTS.SUPPLIERS.AGING + '/xlsx'} xlsxFilename="balance-agee-fournisseurs.xlsx" />}
    />
  );
};

export default SupplierAgingPage;
