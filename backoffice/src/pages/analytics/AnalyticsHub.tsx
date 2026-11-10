/**
 * Analytics overview — an executive dashboard assembled from several reports:
 * headline KPIs with a comparison to the previous period, the revenue trend,
 * sales mix, top products / customers, channels, cash flow, receivables vs
 * payables and stock health. Every panel links to its detailed report.
 */
import React, { useState } from 'react';
import {
  Boxes,
  CreditCard,
  LayoutGrid,
  Layers,
  Percent,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Scale,
} from 'lucide-react';
import { formatDate } from '@orderium/ui';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useLanguage } from '../../context/LanguageContext';
import AnalyticsNav from './components/AnalyticsNav';
import ReportFilterBar from './components/ReportFilterBar';
import ReportChart from './components/ReportChart';
import { KpiTile, Panel, RankList, StatRow } from './overview/OverviewWidgets';
import { fmt, num } from './overview/format';
import { useOverviewData } from './overview/useOverviewData';
import { previousRange } from '../../modules/analytics/analytics.dates';
import { codedValue } from '../../modules/analytics/analytics.labels';
import type { ReportFilter } from '../../modules/analytics/analytics.interface';
import './analytics.css';

type Row = Record<string, unknown>;
const rowsOf = (d: { rows?: Row[] } | null | undefined): Row[] => d?.rows ?? [];
const kpi = (d: { kpis?: Record<string, unknown> } | null | undefined, key: string) =>
  d?.kpis?.[key];

const AnalyticsHub: React.FC = () => {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<ReportFilter>({ preset: 'this_month' });
  const [reload, setReload] = useState(0);
  const { current: c, previous: p, loading, loadedAt } = useOverviewData(filter, reload);

  const prev = previousRange(filter);
  const prevLabel = prev ? `${formatDate(prev[0])} – ${formatDate(prev[1])}` : null;
  const timeLabel = loadedAt?.toLocaleTimeString(language === 'ar' ? 'ar-MA' : 'fr-MA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const rev = c.revenue.data;
  const marginRate = num(kpi(c.margin.data, 'avgMarginRate'));
  const noData = t('reportNoDataAvailable');

  return (
    <AdminLayout>
      <div className="ax-page">
        <PageHeader
          icon={LayoutGrid}
          title={t('analyticsPageTitle')}
          subtitle={t('analyticsOverviewSubtitle')}
          actions={
            <div className="ax-header-actions">
              {timeLabel && (
                <span className="ax-updated" aria-live="polite">
                  <span className={`ax-updated__dot${loading ? ' ax-updated__dot--busy' : ''}`} />
                  {t('analyticsLastUpdated').replace('{time}', timeLabel)}
                </span>
              )}
              <button
                type="button"
                className="ax-icon-btn"
                onClick={() => setReload((n) => n + 1)}
                disabled={loading}
                title={t('analyticsRefresh')}
                aria-label={t('analyticsRefresh')}
              >
                <RefreshCw className={loading ? 'ax-spin' : undefined} aria-hidden="true" />
              </button>
            </div>
          }
        />

        <AnalyticsNav showSubTabs={false} />

        <div className="ax-toolbar ax-ov-toolbar">
          <ReportFilterBar filter={filter} onChange={(f) => setFilter({ ...f, page: undefined })} />
          {prevLabel && (
            <p className="ax-ov-compare">
              {t('analyticsComparedTo').replace('{range}', prevLabel)}
            </p>
          )}
        </div>

        {loading && loadedAt && (
          <div className="ax-progress" role="progressbar" aria-label={t('analyticsLoading')} />
        )}

        {/* ── Headline KPIs ─────────────────────────────────── */}
        <div className="ax-ov-kpis">
          <KpiTile
            label={t('analyticsKpiRevenue')}
            icon={TrendingUp}
            tone="green"
            state={c.revenue}
            value={kpi(rev, 'totalRevenue')}
            previous={p.revenue}
            previousValue={kpi(p.revenue.data, 'totalRevenue')}
            format="currency"
            to="/analytics/sales/revenue"
          />
          <KpiTile
            label={t('analyticsKpiOrders')}
            icon={ShoppingCart}
            tone="blue"
            state={c.revenue}
            value={kpi(rev, 'totalOrders')}
            previous={p.revenue}
            previousValue={kpi(p.revenue.data, 'totalOrders')}
            format="integer"
            to="/analytics/sales/revenue"
          />
          <KpiTile
            label={t('analyticsKpiAvgOrder')}
            icon={ShoppingBag}
            tone="orange"
            state={c.revenue}
            value={kpi(rev, 'avgOrder')}
            previous={p.revenue}
            previousValue={kpi(p.revenue.data, 'avgOrder')}
            format="currency"
            to="/analytics/sales/revenue"
          />
          <KpiTile
            label={t('analyticsKpiMargin')}
            icon={Percent}
            tone="purple"
            state={c.margin}
            value={kpi(c.margin.data, 'totalMargin')}
            previous={p.margin}
            previousValue={kpi(p.margin.data, 'totalMargin')}
            format="currency"
            hint={t('analyticsMarginRateHint').replace('{rate}', fmt(marginRate, 'percent'))}
            to="/analytics/products/margin"
          />
          <KpiTile
            label={t('analyticsKpiPurchases')}
            icon={Boxes}
            tone="teal"
            state={c.purchases}
            value={kpi(c.purchases.data, 'totalPurchases')}
            previous={p.purchases}
            previousValue={kpi(p.purchases.data, 'totalPurchases')}
            higherIsBetter={false}
            format="currency"
            to="/analytics/purchases/by-period"
          />
          <KpiTile
            label={t('analyticsKpiNet')}
            icon={Wallet}
            tone="blue"
            state={c.cashflow}
            value={kpi(c.cashflow.data, 'netCashflow')}
            format="currency"
            hint={`${t('analyticsKpiInflow')} ${fmt(kpi(c.cashflow.data, 'totalInflow'), 'currency')}`}
            to="/analytics/payments/cashflow"
          />
        </div>

        <div className="ax-ov-grid">
          {/* ── Trend + mix ─────────────────────────────────── */}
          <Panel
            span={8}
            title={t('analyticsRevenueTrend')}
            icon={TrendingUp}
            to="/analytics/sales/revenue"
            state={c.revenue}
          >
            {rev?.chart ? (
              <ReportChart chart={rev.chart} bare height={280} />
            ) : (
              <EmptyNote text={noData} />
            )}
          </Panel>
          <Panel
            span={4}
            title={t('analyticsSalesMix')}
            icon={Layers}
            to="/analytics/sales/by-category"
            state={c.byCategory}
          >
            {c.byCategory.data?.chart ? (
              <ReportChart chart={c.byCategory.data.chart} bare height={280} />
            ) : (
              <EmptyNote text={noData} />
            )}
          </Panel>

          {/* ── Rankings ────────────────────────────────────── */}
          <Panel
            span={4}
            title={t('analyticsTop5Products')}
            icon={Trophy}
            to="/analytics/sales/top-products"
            state={c.topProducts}
          >
            <RankList
              empty={noData}
              items={rowsOf(c.topProducts.data).map((r, i) => ({
                key: String(r.productId ?? i),
                label: String(r.productName ?? '—'),
                value: num(r.totalRevenue),
                meta: t('analyticsQtySold').replace('{qty}', fmt(r.totalQty, 'number')),
              }))}
            />
          </Panel>
          <Panel
            span={4}
            title={t('analyticsTop5Customers')}
            icon={Users}
            to="/analytics/sales/by-customer"
            state={c.topCustomers}
          >
            <RankList
              empty={noData}
              items={rowsOf(c.topCustomers.data).map((r, i) => ({
                key: String(r.customerId ?? i),
                label: String(r.customerName ?? '—'),
                value: num(r.totalRevenue),
                meta: t(
                  num(r.orderCount) === 1 ? 'analyticsOrdersCountOne' : 'analyticsOrdersCount',
                ).replace('{count}', fmt(r.orderCount, 'integer')),
              }))}
            />
          </Panel>
          <Panel
            span={4}
            title={t('analyticsSalesByChannel')}
            icon={Store}
            to="/analytics/sales/by-pos"
            state={c.byChannel}
          >
            <RankList
              empty={noData}
              items={rowsOf(c.byChannel.data).map((r, i) => ({
                key: String(r.channel ?? i),
                label: codedValue('channel', r.channel, t)?.label ?? String(r.channel ?? '—'),
                value: num(r.totalRevenue),
                meta: t(
                  num(r.orderCount) === 1 ? 'analyticsOrdersCountOne' : 'analyticsOrdersCount',
                ).replace('{count}', fmt(r.orderCount, 'integer')),
              }))}
            />
          </Panel>

          {/* ── Cash, balances, stock ───────────────────────── */}
          <Panel
            span={6}
            title={t('analyticsCashInOut')}
            icon={CreditCard}
            to="/analytics/payments/cashflow"
            state={c.cashflow}
          >
            {c.cashflow.data?.chart ? (
              <ReportChart chart={c.cashflow.data.chart} bare height={260} />
            ) : (
              <EmptyNote text={noData} />
            )}
          </Panel>
          <Panel
            span={3}
            title={t('analyticsReceivablesPayables')}
            icon={Scale}
            to="/analytics/clients/aging"
            state={[c.receivables, c.payables, c.outstanding]}
          >
            <div className="ax-stats">
              <StatRow
                label={t('analyticsKpiReceivables')}
                value={kpi(c.receivables.data, 'totalCreances')}
                format="currency"
              />
              <StatRow
                label={t('analyticsKpiOver90')}
                value={kpi(c.receivables.data, 'over90')}
                format="currency"
                tone={num(kpi(c.receivables.data, 'over90')) > 0 ? 'danger' : 'default'}
              />
              <StatRow
                label={t('analyticsKpiPayables')}
                value={kpi(c.payables.data, 'totalDettes')}
                format="currency"
              />
              <StatRow
                label={t('analyticsKpiOverdue')}
                value={kpi(c.outstanding.data, 'overdueCount')}
                format="integer"
                tone={num(kpi(c.outstanding.data, 'overdueCount')) > 0 ? 'warning' : 'default'}
              />
            </div>
          </Panel>
          <Panel
            span={3}
            title={t('analyticsStockHealth')}
            icon={Boxes}
            to="/analytics/stock/low-stock"
            state={[c.stockValue, c.lowStock]}
          >
            <div className="ax-stats">
              <StatRow
                label={t('analyticsKpiStockValue')}
                value={kpi(c.stockValue.data, 'totalValuation')}
                format="currency"
              />
              <StatRow
                label={t('analyticsKpiOutOfStock')}
                value={kpi(c.lowStock.data, 'outOfStockCount')}
                format="integer"
                tone={num(kpi(c.lowStock.data, 'outOfStockCount')) > 0 ? 'danger' : 'success'}
              />
            </div>
            <ul className="ax-ov-alerts">
              {rowsOf(c.lowStock.data).length === 0 ? (
                <li className="ax-ov-alerts__ok">{t('analyticsNoStockAlerts')}</li>
              ) : (
                rowsOf(c.lowStock.data).map((r, i) => {
                  const qty = num(r.quantity);
                  return (
                    <li key={String(r.productId ?? i)} className="ax-ov-alerts__row">
                      <span className="ax-ov-alerts__name" title={String(r.productName ?? '')}>
                        {String(r.productName ?? '—')}
                      </span>
                      <StatusBadge
                        size="sm"
                        tone={qty <= 0 ? 'danger' : 'warning'}
                        label={qty <= 0 ? t('analyticsKpiOutOfStock') : fmt(qty, 'number')}
                      />
                    </li>
                  );
                })
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </AdminLayout>
  );
};

const EmptyNote: React.FC<{ text: string }> = ({ text }) => (
  <div className="ax-empty ax-empty--chart">
    <p>{text}</p>
  </div>
);

export default AnalyticsHub;
