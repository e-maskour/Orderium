import { PackageX } from 'lucide-react';
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
  { field: 'productName', header: 'Produit' },
  { field: 'sku', header: 'SKU' },
  {
    field: 'price',
    header: 'Prix (MAD)',
    body: (row: Record<string, unknown>) =>
      Number(row.price).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
  },
  { field: 'stock', header: 'Stock actuel' },
];

const NeverSoldProductsPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_year' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getNeverSoldProducts(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  return (
    <ReportLayout
      icon={PackageX}
      title="Produits jamais vendus"
      subtitle="Articles actifs sans aucune vente enregistrée"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.PRODUCTS.NEVER_SOLD + '/xlsx',
            filter,
          )}
          xlsxFilename="produits-jamais-vendus.xlsx"
        />
      }
    />
  );
};

export default NeverSoldProductsPage;
