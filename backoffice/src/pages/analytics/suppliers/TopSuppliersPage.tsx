import { Award } from 'lucide-react';
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

const MAD = (row: Record<string, unknown>, field: string) =>
  Number(row[field]).toLocaleString('fr-MA', { minimumFractionDigits: 2 });

const TopSuppliersPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_year' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getTopSuppliers(filter),
  );
  const handleFilterChange = (f: ReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'rank', header: '#' },
    { field: 'supplierName', header: t('supplier') },
    { field: 'orderCount', header: t('analyticsTopSuppliersOrderCount') },
    {
      field: 'totalAmount',
      header: `${t('analyticsTopSuppliersTotalAmount')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'totalAmount'),
    },
  ];

  return (
    <ReportLayout
      icon={Award}
      title={t('analyticsTopSuppliersTitle')}
      subtitle={t('analyticsTopSuppliersSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.SUPPLIERS.TOP + '/xlsx', filter)}
          xlsxFilename="top-fournisseurs.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'suppliers-top',
              title: t('analyticsTopSuppliersTitle'),
              subtitle: t('analyticsTopSuppliersSubtitle'),
              fileName: 'top-fournisseurs',
              columns: [
                { key: 'rank', header: '#', align: 'center', width: '6%' },
                { key: 'supplierName', header: t('supplier'), emphasis: true },
                {
                  key: 'orderCount',
                  header: t('analyticsTopSuppliersOrderCount'),
                  format: 'integer',
                  total: true,
                },
                {
                  key: 'totalAmount',
                  header: t('analyticsTopSuppliersTotalAmount'),
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

export default TopSuppliersPage;
