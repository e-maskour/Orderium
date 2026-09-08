import { useMemo, useState } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useTenantMetric, useTenantSeries, useCollectTenantMetrics } from '../hooks/useMetrics';
import { SkeletonCard } from './Skeleton';
import { TrendChart, ShareBar, QuotaBar, type TrendSeries } from './Charts';
import {
  formatBytes,
  formatCompact,
  formatDateTime,
  formatDayLabel,
  formatMoney,
  shiftIso,
  todayIso,
} from '../utils/format';
import type { TenantMetricRow } from '../types/metrics';

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

const SERIES_METRICS = 'ordersToday,quotesToday,invoicesToday,activeUsers,apiCalls';

/**
 * Metrics tab for a single tenant.
 *
 * Self-contained so it can be dropped into TenantDetail without threading any
 * additional state through that already-large page.
 */
export function TenantMetricsPanel({ tenantId }: { tenantId: number }) {
  const [days, setDays] = useState<number>(30);
  const range = useMemo(() => {
    const to = todayIso();
    return { from: shiftIso(to, -(days - 1)), to };
  }, [days]);

  const { data: metric, isLoading } = useTenantMetric(tenantId);
  const { data: series } = useTenantSeries(tenantId, {
    ...range,
    metrics: SERIES_METRICS,
  });
  const refresh = useCollectTenantMetrics();

  if (isLoading || !metric) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const trendSeries: TrendSeries[] = series
    ? [
        {
          key: 'ordersToday',
          label: 'Orders',
          color: '#6366f1',
          values: series.points.map((p) => Number(p.ordersToday ?? 0)),
        },
        {
          key: 'quotesToday',
          label: 'Devis',
          color: '#f59e0b',
          values: series.points.map((p) => Number(p.quotesToday ?? 0)),
        },
        {
          key: 'invoicesToday',
          label: 'Invoices',
          color: '#10b981',
          values: series.points.map((p) => Number(p.invoicesToday ?? 0)),
        },
        {
          key: 'activeUsers',
          label: 'Active users',
          color: '#0ea5e9',
          values: series.points.map((p) => Number(p.activeUsers ?? 0)),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <FreshnessBar
        metric={metric}
        days={days}
        onDaysChange={setDays}
        onRefresh={() => refresh.mutate(tenantId)}
        refreshing={refresh.isPending}
      />

      {metric.collectionError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/15">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Last collection failed
            </p>
            <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/80">
              {metric.collectionError}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Orders"
          value={metric.ordersTotal.toLocaleString()}
          sub={`${metric.orders30d.toLocaleString()} in last 30d`}
        />
        <Stat
          label="Users"
          value={metric.usersTotal.toLocaleString()}
          sub={`${metric.usersAdmin} staff · ${metric.usersTotal - metric.usersAdmin} portal`}
        />
        <Stat label="Products" value={metric.productsTotal.toLocaleString()} />
        <Stat label="Revenue" value={formatMoney(metric.revenueTotal)} />
        <Stat label="Devis" value={metric.quotesTotal.toLocaleString()} />
        <Stat
          label="Invoices"
          value={metric.invoicesTotal.toLocaleString()}
          sub={metric.invoicesUnpaid > 0 ? `${metric.invoicesUnpaid} unpaid` : undefined}
        />
        <Stat
          label="Partners"
          value={(metric.partnersCustomers + metric.partnersSuppliers).toLocaleString()}
          sub={`${metric.partnersCustomers} customers · ${metric.partnersSuppliers} suppliers`}
        />
        <Stat
          label="Footprint"
          value={formatBytes(metric.dbSizeBytes)}
          sub={`+ ${formatBytes(metric.storageBytes)} in files`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Daily activity</h3>
          <p className="mb-4 text-xs text-slate-400">Documents created and users active per day</p>
          <TrendChart
            labels={(series?.points ?? []).map((p) => formatDayLabel(String(p.date)))}
            series={trendSeries}
            height={200}
          />
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Orders by channel
            </h3>
            <p className="mb-4 text-xs text-slate-400">All-time entry points</p>
            <ShareBar
              segments={[
                {
                  label: 'Back-office',
                  value: metric.ordersByOrigin?.BACKOFFICE ?? 0,
                  color: '#6366f1',
                },
                {
                  label: 'Admin POS',
                  value: metric.ordersByOrigin?.ADMIN_POS ?? 0,
                  color: '#8b5cf6',
                },
                {
                  label: 'Client POS',
                  value: metric.ordersByOrigin?.CLIENT_POS ?? 0,
                  color: '#06b6d4',
                },
              ]}
            />
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Plan limits</h3>
            <p className="mb-4 text-xs text-slate-400">
              Usage against this tenant&apos;s subscription quota
            </p>
            <div className="space-y-4">
              <QuotaBar label="Staff seats" {...metric.quota.users} />
              <QuotaBar label="Products" {...metric.quota.products} />
              <QuotaBar label="Orders this month" {...metric.quota.ordersPerMonth} />
              <QuotaBar label="Storage" unit="MB" {...metric.quota.storageMb} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UsageCard metric={metric} />
        <HealthCard metric={metric} />
      </div>
    </div>
  );
}

function FreshnessBar({
  metric,
  days,
  onDaysChange,
  onRefresh,
  refreshing,
}: {
  metric: TenantMetricRow;
  days: number;
  onDaysChange: (d: number) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Snapshot as of{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {formatDateTime(metric.collectedAt)}
        </span>
      </p>
      <div className="flex items-center gap-2">
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => onDaysChange(r.days)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                days === r.days
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="btn-secondary !px-3 !py-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}

function UsageCard({ metric }: { metric: TenantMetricRow }) {
  // callsByModule is not on the row projection; the headline usage numbers are.
  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">App usage</h3>
      <p className="mb-4 text-xs text-slate-400">
        Live activity, flushed from Redis every two minutes
      </p>
      <div className="space-y-3">
        <Row label="Active users today" value={metric.activeUsers.toLocaleString()} />
        <Row label="API calls today" value={formatCompact(metric.apiCalls)} />
        <Row
          label="Last activity"
          value={
            metric.lastActivityAt
              ? `${formatDateTime(metric.lastActivityAt)}${
                  metric.daysSinceActivity !== null && metric.daysSinceActivity > 0
                    ? ` (${metric.daysSinceActivity}d ago)`
                    : ''
                }`
              : 'Never'
          }
        />
        <Row
          label="Churn risk"
          value={metric.riskScore === 0 ? 'None' : `${metric.riskScore}/100`}
        />
      </div>
      {metric.riskReasons.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
          {metric.riskReasons.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HealthCard({ metric }: { metric: TenantMetricRow }) {
  const h = metric.health;
  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Health (last 24h)</h3>
      <p className="mb-4 text-xs text-slate-400">Request outcomes and latency for this tenant</p>
      {!h || h.requests === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No requests recorded in the last 24 hours
        </p>
      ) : (
        <div className="space-y-3">
          <Row label="Requests" value={formatCompact(h.requests)} />
          <Row
            label="Failure rate"
            value={`${h.errorRate.toFixed(2)}%`}
            tone={
              h.errorRate >= 5
                ? 'text-red-600 dark:text-red-400'
                : h.errorRate >= 1
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }
          />
          <Row label="Server errors" value={h.errors5xx.toLocaleString()} />
          <Row label="Client errors" value={h.errors4xx.toLocaleString()} />
          <Row label="p95 latency" value={`${h.p95LatencyMs.toLocaleString()} ms`} />
          <Row label="Average latency" value={`${h.avgLatencyMs.toLocaleString()} ms`} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  tone = 'text-slate-800 dark:text-slate-200',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}
