import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertOctagon, ChevronRight, Gauge, Timer, TriangleAlert } from 'lucide-react';
import { usePlatformHealth } from '../hooks/useMetrics';
import { SkeletonCard } from '../components/Skeleton';
import { TrendChart, type TrendSeries } from '../components/Charts';
import { formatCompact } from '../utils/format';
import type { PlatformHealth, TenantHealthSummary } from '../types/metrics';

const WINDOWS = [
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
] as const;

export function Health() {
  const [hours, setHours] = useState<number>(24);
  const { data, isLoading } = usePlatformHealth({ hours });

  return (
    <div className="animate-fade-in space-y-6 px-6 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            App health
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Request volume, failures and latency, attributed per tenant
          </p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
          {WINDOWS.map((w) => (
            <button
              key={w.label}
              type="button"
              onClick={() => setHours(w.hours)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                hours === w.hours
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data.totals.requests === 0 ? (
        <EmptyState hours={hours} />
      ) : (
        <>
          <HealthKpis totals={data.totals} />
          <RequestChart data={data} />
          <WorstTenants tenants={data.worstTenants} />
        </>
      )}
    </div>
  );
}

function HealthKpis({ totals }: { totals: TenantHealthSummary }) {
  const errorTone =
    totals.errorRate >= 5
      ? 'text-red-600 dark:text-red-400'
      : totals.errorRate >= 1
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        icon={<Activity className="h-4 w-4" />}
        label="Requests"
        value={formatCompact(totals.requests)}
        sub={`${totals.errors4xx.toLocaleString()} client errors`}
      />
      <Tile
        icon={<AlertOctagon className="h-4 w-4" />}
        label="Failure rate"
        value={`${totals.errorRate.toFixed(2)}%`}
        // Only 5xx counts: a 404 or a rejected login is the system behaving.
        sub={`${totals.errors5xx.toLocaleString()} server errors`}
        valueClass={errorTone}
      />
      <Tile
        icon={<Timer className="h-4 w-4" />}
        label="p95 latency"
        value={`${totals.p95LatencyMs.toLocaleString()} ms`}
        sub={`${totals.avgLatencyMs.toLocaleString()} ms average`}
      />
      <Tile
        icon={<Gauge className="h-4 w-4" />}
        label="Slow requests"
        value={formatCompact(totals.slowRequests)}
        sub={`peak ${totals.maxLatencyMs.toLocaleString()} ms`}
      />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  sub,
  valueClass = 'text-slate-900 dark:text-slate-50',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {icon}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </span>
      </div>
      <p className={`mt-3 text-2xl font-extrabold tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function RequestChart({ data }: { data: PlatformHealth }) {
  const labels = data.series.map((p) =>
    new Date(p.bucketStart).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );

  const series: TrendSeries[] = [
    {
      key: 'requests',
      label: 'Requests',
      color: '#6366f1',
      values: data.series.map((p) => p.requests),
    },
    {
      key: 'errors5xx',
      label: 'Server errors',
      color: '#ef4444',
      values: data.series.map((p) => p.errors5xx),
    },
    {
      key: 'errors4xx',
      label: 'Client errors',
      color: '#f59e0b',
      values: data.series.map((p) => p.errors4xx),
    },
  ];

  return (
    <div className="card p-5">
      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Traffic and failures</h2>
      <p className="mb-4 text-xs text-slate-400">Hourly buckets across all tenants</p>
      <TrendChart labels={labels} series={series} height={200} />
    </div>
  );
}

function WorstTenants({ tenants }: { tenants: PlatformHealth['worstTenants'] }) {
  return (
    <div className="card p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
        <TriangleAlert className="h-4 w-4 text-amber-500" />
        Highest failure rates
      </h2>
      <p className="mb-4 text-xs text-slate-400">
        Tenants ranked by share of requests returning a server error
      </p>

      {tenants.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No tenant traffic recorded in this window
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tenant
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Requests
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  5xx
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Failure rate
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  p95
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t.tenantId}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/tenants/${t.tenantId}`}
                      className="font-semibold text-slate-800 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {t.requests.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {t.errors5xx.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                        t.errorRate >= 5
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : t.errorRate >= 1
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}
                    >
                      {t.errorRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {t.p95LatencyMs.toLocaleString()} ms
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Health data comes from the request interceptor, which needs Redis. Saying so
 * turns a confusing empty page into an actionable one.
 */
function EmptyState({ hours }: { hours: number }) {
  return (
    <div className="card p-10 text-center">
      <Activity className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
      <h2 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
        No request data in the last {hours}h
      </h2>
      <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
        Health metrics are collected from live tenant traffic and flushed from Redis every two
        minutes. If this stays empty while tenants are active, check that{' '}
        <code className="font-mono">REDIS_URL</code> is reachable from the API.
      </p>
    </div>
  );
}
