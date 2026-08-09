import { Truck } from 'lucide-react';
import React, { useState } from 'react';
import ReportLayout from '../components/ReportLayout';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { buildPdfSpec } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { ReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const PurchasesTopSuppliersPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getPurchasesTopSuppliers(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'supplierName', header: t('supplier') },
    { field: 'orderCount', header: t('analyticsPurchasesOrderCount') },
    {
      field: 'totalPurchases',
      header: `${t('analyticsPurchasesAmount')} (MAD)`,
      body: (row: Record<string, unknown>) =>
        Number(row.totalPurchases).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <ReportLayout
      icon={Truck}
      title={t('analyticsTopSuppliersTitle')}
      subtitle={t('analyticsTopSuppliersSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.PURCHASES.TOP_SUPPLIERS + '/xlsx',
            filter,
          )}
          xlsxFilename="top-fournisseurs-achats.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'purchases-top-suppliers',
              title: t('analyticsTopSuppliersTitle'),
              subtitle: t('analyticsTopSuppliersSubtitle'),
              fileName: 'top-fournisseurs-achats',
              columns: [
                { key: 'supplierName', header: t('supplier'), emphasis: true },
                {
                  key: 'orderCount',
                  header: t('analyticsPurchasesOrderCount'),
                  format: 'integer',
                  total: true,
                },
                {
                  key: 'totalPurchases',
                  header: t('analyticsPurchasesAmount'),
                  format: 'currency',
                  total: true,
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

export default PurchasesTopSuppliersPage;
