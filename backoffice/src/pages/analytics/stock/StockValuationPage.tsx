import { DollarSign } from 'lucide-react';
import React, { useState } from 'react';
import { formatAmount } from '@orderium/ui';
import ReportLayout from '../components/ReportLayout';
import ReportKpiCards from '../components/ReportKpiCards';
import ReportTable from '../components/ReportTable';
import ExportButtons from '../components/ExportButtons';
import { useReport } from '../../../hooks/useReport';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { buildPdfSpec } from '../../../modules/analytics/analytics.pdf';
import { API_ROUTES } from '../../../common/api/api-routes';
import { useLanguage } from '../../../context/LanguageContext';
import type { StockReportFilter, ReportData } from '../../../modules/analytics/analytics.interface';

const MAD = (row: Record<string, unknown>, field: string) => formatAmount(Number(row[field]));

const StockValuationPage: React.FC = () => {
  const { t } = useLanguage();
  const [filter] = useState<StockReportFilter>({});
  const { data, isLoading, error, refetch } = useReport<ReportData>(() =>
    analyticsService.getStockValuation(filter),
  );

  const columns = [
    { field: 'productName', header: t('analyticsStockProduct') },
    { field: 'sku', header: t('analyticsSku') },
    { field: 'quantity', header: t('analyticsStockQuantityInStock') },
    {
      field: 'cost',
      header: `${t('analyticsStockUnitCost')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'cost'),
    },
    {
      field: 'totalValue',
      header: `${t('analyticsStockTotalValue')} (MAD)`,
      body: (row: Record<string, unknown>) => MAD(row, 'totalValue'),
    },
  ];

  return (
    <ReportLayout
      icon={DollarSign}
      title={t('analyticsStockValuationTitle')}
      subtitle={t('analyticsStockValuationSubtitle')}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      kpiCards={data && <ReportKpiCards reportKey="stock-valuation" values={data.kpis} />}
      table={<ReportTable columns={columns} rows={data?.rows ?? []} loading={isLoading} />}
      exportButtons={
        <ExportButtons
          xlsxUrl={analyticsService.xlsxUrl(API_ROUTES.REPORTS.STOCK.VALUATION + '/xlsx', filter)}
          xlsxFilename="valorisation-stock.xlsx"
          filter={filter}
          pdf={buildPdfSpec(
            {
              reportKey: 'stock-valuation',
              title: t('analyticsStockValuationTitle'),
              subtitle: t('analyticsStockValuationSubtitle'),
              fileName: 'valorisation-stock',
              columns: [
                {
                  key: 'productName',
                  header: t('analyticsStockProduct'),
                  emphasis: true,
                },
                { key: 'sku', header: t('analyticsSku') },
                {
                  key: 'quantity',
                  header: t('analyticsStockQuantityInStock'),
                  format: 'number',
                  total: true,
                },
                {
                  key: 'cost',
                  header: t('analyticsStockUnitCost'),
                  format: 'currency',
                },
                {
                  key: 'totalValue',
                  header: t('analyticsStockTotalValue'),
                  format: 'currency',
                  emphasis: true,
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

export default StockValuationPage;
