import { ScrollText } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type {
  PartnerStatementFilter,
  ReportData,
} from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => {
  const v = Number(row[field]);
  return isNaN(v) ? '—' : v.toLocaleString('fr-MA', { minimumFractionDigits: 2 });
};

const COLUMNS = [
  { field: 'date', header: 'Date' },
  { field: 'reference', header: 'Référence' },
  { field: 'description', header: 'Description' },
  {
    field: 'debit',
    header: 'Débit (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'debit'),
  },
  {
    field: 'credit',
    header: 'Crédit (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'credit'),
  },
  {
    field: 'balance',
    header: 'Solde (MAD)',
    body: (row: Record<string, unknown>) => MAD(row, 'balance'),
  },
];

const SupplierStatementPage: React.FC = () => {
  const [filter, setFilter] = useState<PartnerStatementFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSupplierStatement(filter),
  );
  const handleFilterChange = (f: PartnerStatementFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  return (
    <ReportLayout
      icon={ScrollText}
      title="Relevé de compte fournisseur"
      subtitle="Historique complet — commandes, factures et paiements"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={
        <ReportTable
          columns={COLUMNS}
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
            API_ROUTES.REPORTS.SUPPLIERS.STATEMENT + '/xlsx',
            filter,
          )}
          xlsxFilename="releve-fournisseur.xlsx"
        />
      }
    />
  );
};

export default SupplierStatementPage;
