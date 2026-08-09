import { Package } from 'lucide-react';
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

const PurchasesByProductPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getPurchasesByProduct(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'productName', header: t('analyticsPurchasesProduct') },
    { field: 'totalQty', header: t('analyticsPurchasesQuantityBought') },
    {
      field: 'totalCost',
      header: `${t('analyticsPurchasesAmount')} (MAD)`,
      body: (row: Record<string, unknown>) =>
        Number(row.totalCost).toLocaleString('fr-MA', { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <ReportLayout
      icon={Package}
      title={t('analyticsPurchasesByProductTitle')}
      subtitle={t('analyticsPurchasesByProductSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(
            API_ROUTES.REPORTS.PURCHASES.BY_PRODUCT + '/xlsx',
            filter,
          )}
          xlsxFilename="achats-produit.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'purchases-by-product',
              title: t('analyticsPurchasesByProductTitle'),
              subtitle: t('analyticsPurchasesByProductSubtitle'),
              fileName: 'achats-produit',
              columns: [
                {
                  key: 'productName',
                  header: t('analyticsPurchasesProduct'),
                  emphasis: true,
                },
                {
                  key: 'totalQty',
                  header: t('analyticsPurchasesQuantityBought'),
                  format: 'integer',
                  total: true,
                },
                {
                  key: 'totalCost',
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

export default PurchasesByProductPage;
