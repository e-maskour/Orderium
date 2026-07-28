import { Truck } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { API_ROUTES } from '../../../common/api/api-routes';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const COLUMNS = [
  { field: 'supplierName', header: 'Fournisseur' },
  { field: 'orderCount', header: 'Nb commandes' },
  {
    field: 'totalPurchases',
    header: 'Montant (MAD)',
    body: (row: Record<string, unknown>) =>
      Number(row.totalPurchases).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
  },
];

const PurchasesTopSuppliersPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getPurchasesTopSuppliers(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  return (
    <ReportLayout
      icon={Truck}
      title="Top fournisseurs"
      subtitle="Fournisseurs avec le plus de commandes"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.PURCHASES.TOP_SUPPLIERS + '/xlsx',
            filter,
          )}
          xlsxFilename="top-fournisseurs-achats.xlsx"
        />
      }
    />
  );
};

export default PurchasesTopSuppliersPage;
