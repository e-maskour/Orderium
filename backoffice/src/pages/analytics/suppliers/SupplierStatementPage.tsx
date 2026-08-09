import { ScrollText } from 'lucide-react';
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
import type {
  PartnerStatementFilter,
  ReportData,
} from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => {
  const v = Number(row[field]);
  return isNaN(v) ? '—' : v.toLocaleString('fr-MA', { minimumFractionDigits: 2 });
};

const SupplierStatementPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<PartnerStatementFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getSupplierStatement(filter),
  );
  const handleFilterChange = (f: PartnerStatementFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'date', header: t('date') },
    { field: 'reference', header: t('reference') },
    { field: 'description', header: t('description') },
    {
      field: 'debit',
      header: `${t('debit')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'debit'),
    },
    {
      field: 'credit',
      header: `${t('credit')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'credit'),
    },
    {
      field: 'balance',
      header: `${t('balance')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'balance'),
    },
  ];

  return (
    <ReportLayout
      icon={ScrollText}
      title={t('analyticsSupplierStatementTitle')}
      subtitle={t('analyticsSupplierStatementSubtitle')}
      isLoading={isLoading}
      error={error}
      filterBar={<ReportFilterBar filter={filter} onChange={handleFilterChange} />}
      table={
        <ReportTable
          columns={columns}
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
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'suppliers-statement',
              title: t('analyticsSupplierStatementTitle'),
              subtitle: t('analyticsSupplierStatementSubtitle'),
              fileName: 'releve-fournisseur',
              columns: [
                { key: 'date', header: t('date'), format: 'date' },
                { key: 'reference', header: t('reference'), emphasis: true },
                { key: 'description', header: t('description') },
                {
                  key: 'debit',
                  header: t('debit'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'credit',
                  header: t('credit'),
                  format: 'currency',
                  total: true,
                },
                {
                  key: 'balance',
                  header: t('balance'),
                  format: 'currency',
                  signed: true,
                  emphasis: true,
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

export default SupplierStatementPage;
