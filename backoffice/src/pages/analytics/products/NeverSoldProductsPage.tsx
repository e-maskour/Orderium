import { PackageX } from 'lucide-react';
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

const NeverSoldProductsPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_year' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getNeverSoldProducts(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'productName', header: t('analyticsProductPerformanceProduct') },
    { field: 'sku', header: t('analyticsSku') },
    {
      field: 'price',
      header: `${t('analyticsNeverSoldPrice')} (MAD)`,
      body: (row: Record<string, unknown>) =>
        Number(row.price).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
    },
    { field: 'stock', header: t('analyticsStockCurrentQuantity') },
  ];

  return (
    <ReportLayout
      icon={PackageX}
      title={t('analyticsNeverSoldProductsTitle')}
      subtitle={t('analyticsNeverSoldProductsSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.PRODUCTS.NEVER_SOLD + '/xlsx',
            filter,
          )}
          xlsxFilename="produits-jamais-vendus.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'products-never-sold',
              title: t('analyticsNeverSoldProductsTitle'),
              subtitle: t('analyticsNeverSoldProductsSubtitle'),
              fileName: 'produits-jamais-vendus',
              columns: [
                {
                  key: 'productName',
                  header: t('analyticsProductPerformanceProduct'),
                  emphasis: true,
                },
                { key: 'sku', header: t('analyticsSku') },
                {
                  key: 'price',
                  header: t('analyticsNeverSoldPrice'),
                  format: 'currency',
                },
                {
                  key: 'stock',
                  header: t('analyticsStockCurrentQuantity'),
                  format: 'number',
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

export default NeverSoldProductsPage;
