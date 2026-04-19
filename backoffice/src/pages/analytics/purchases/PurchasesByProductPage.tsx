import { Package } from 'lucide-react';
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
  { field: 'totalQty', header: 'Qté achetée' },
  { field: 'totalCost', header: 'Montant (MAD)', body: (row: Record<string, unknown>) => Number(row.totalCost).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) },
];

const PurchasesByProductPage: React.FC = () => {
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() => analyticsService.getPurchasesByProduct(filter));
  const handleFilterChange = (f: ReportFilter) => { setFilter(f); setTimeout(refetch, 0); };

  return (
    <ReportLayout
      icon={Package}
      title="Achats par produit"
      subtitle="Produits les plus achetés"
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={COLUMNS} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={<ExportButtons xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.PURCHASES.BY_PRODUCT + '/xlsx', filter)} xlsxFilename="achats-produit.xlsx" />}
    />
  );
};

export default PurchasesByProductPage;
