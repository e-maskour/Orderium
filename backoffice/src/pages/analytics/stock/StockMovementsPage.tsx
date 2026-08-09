import { ArrowUpDown } from 'lucide-react';
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
import type { StockReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const StockMovementsPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<StockReportFilter>({ preset: 'this_month' });
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getStockMovements(filter),
  );
  const handleFilterChange = (f: StockReportFilter) => {
    setFilter(f);
    setTimeout(refetch, 0);
  };

  const columns = [
    { field: 'date', header: t('date') },
    { field: 'reference', header: t('reference') },
    { field: 'productName', header: t('analyticsStockProduct') },
    { field: 'movementType', header: t('type') },
    { field: 'quantity', header: t('analyticsStockQuantity') },
    { field: 'sourceWarehouse', header: t('analyticsStockSource') },
    { field: 'destWarehouse', header: t('analyticsStockDestination') },
  ];

  return (
    <ReportLayout
      icon={ArrowUpDown}
      title={t('analyticsStockMovementsTitle')}
      subtitle={t('analyticsStockMovementsSubtitle')}
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
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.STOCK.MOVEMENTS + '/xlsx', filter)}
          xlsxFilename="mouvements-stock.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'stock-movements',
              title: t('analyticsStockMovementsTitle'),
              subtitle: t('analyticsStockMovementsSubtitle'),
              fileName: 'mouvements-stock',
              landscape: true,
              columns: [
                { key: 'date', header: t('date'), format: 'date' },
                { key: 'reference', header: t('reference'), emphasis: true },
                { key: 'productName', header: t('analyticsStockProduct') },
                { key: 'movementType', header: t('type'), align: 'center' },
                {
                  key: 'quantity',
                  header: t('analyticsStockQuantity'),
                  format: 'number',
                  signed: true,
                },
                { key: 'sourceWarehouse', header: t('analyticsStockSource') },
                {
                  key: 'destWarehouse',
                  header: t('analyticsStockDestination'),
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

export default StockMovementsPage;
