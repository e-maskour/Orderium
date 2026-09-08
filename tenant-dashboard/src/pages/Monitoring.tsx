import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  ChevronRight,
  FileText,
  RefreshCw,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useMetricsOverview, useCollectMetrics } from '../hooks/useMetrics';
import { SkeletonCard } from '../components/Skeleton';
import { TrendChart, ShareBar, type TrendSeries } from '../components/Charts';
import {
  formatBytes,
  formatCompact,
  formatDateTime,
  formatDayLabel,
  formatMoney,
  shiftIso,
  todayIso,
} from '../utils/format';
import type { PlatformAlert, PlatformOverview } from '../types/metrics';

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

/** Stable colours shared by the trend chart and the order-origin split. */
const COLORS = {
  orders: '#6366f1',
  quotes: '#f59e0b',
  invoices: '#10b981',
  activeUsers: '#0ea5e9',
  apiCalls: '#a855f7',
  errors: '#ef4444',
  backoffice: '#6366f1',
  adminPos: '#8b5cf6',
  clientPos: '#06b6d4',
  otherOrigin: '#94a3b8',
};

export function Monitoring() {
  const [days, setDays] = useState<number>(30);
  const range = useMemo(() => {
    const to = todayIso();
    return { from: shiftIso(to, -(days - 1)), to };
  }, [days]);

  const { data, isLoading, isFetching } = useMetricsOverview(range);
  const collect = useCollectMetrics();

  return (
    <div className="animate-fade-in space-y-6 px-6 py-6 lg:px-8 lg:py-8">
      <Header
        data={data}
        days={days}
        onDaysChange={setDays}
        onCollect={() => collect.mutate()}
        collecting={collect.isPending}
        refreshing={isFetching}
      />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <KpiGrid data={data} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Platform activity
              </h2>
              <p className="mb-4 text-xs text-slate-400">
                Documents created and users active per day, across all tenants
              </p>
              <TrendSection data={data} />
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Orders by channel
              </h2>
              <p className="mb-4 text-xs text-slate-400">
                All-time split across the order entry points
              </p>
              <ShareBar
                segments={[
                  {
                    label: 'Back-office',
                    value: data.totals.ordersByOrigin.BACKOFFICE ?? 0,
                    color: COLORS.backoffice,
                  },
                  {
                    label: 'Admin POS',
                    value: data.totals.ordersByOrigin.ADMIN_POS ?? 0,
                    color: COLORS.adminPos,
                  },
                  {
                    label: 'Client POS',
                    value: data.totals.ordersByOrigin.CLIENT_POS ?? 0,
                    color: COLORS.clientPos,
                  },
                  ...otherOrigins(data.totals.ordersByOrigin),
                ]}
              />

              <div className="mt-6 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <MiniStat
                  label="Orders this month"
                  value={data.totals.ordersThisMonth.toLocaleString()}
                />
                <MiniStat label="Database footprint" value={formatBytes(data.totals.dbSizeBytes)} />
                <MiniStat label="Object storage" value={formatBytes(data.totals.storageBytes)} />
              </div>
            </div>
          </div>

          <AlertsPanel alerts={data.alerts} />
        </>
      )}
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({
  data,
  days,
  onDaysChange,
  onCollect,
  collecting,
  refreshing,
}: {
  data: PlatformOverview | undefined;
  days: number;
  onDaysChange: (days: number) => void;
  onCollect: () => void;
  collecting: boolean;
  refreshing: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Monitoring
        </h1>
        {/* Freshness is stated explicitly: these are nightly snapshots, and a
            stale number that looks live is worse than no number. */}
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Snapshot as of{' '}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {formatDateTime(data?.lastCollectedAt)}
          </span>
          {data && data.staleTenants > 0 && (
            <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {data.staleTenants} stale
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => onDaysChange(r.days)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
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
          onClick={onCollect}
          disabled={collecting}
          className="btn-secondary"
          title="Walk every tenant database and refresh the snapshot now"
        >
          <RefreshCw className={`h-4 w-4 ${collecting || refreshing ? 'animate-spin' : ''}`} />
          {collecting ? 'Collecting…' : 'Collect now'}
        </button>
      </div>
    </div>
  );
}

// ─── KPI grid ────────────────────────────────────────────────────────────────

function KpiGrid({ data }: { data: PlatformOverview }) {
  const t = data.totals;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        icon={<ShoppingCart className="h-4 w-4" />}
        label="Orders"
        value={formatCompact(t.orders)}
        delta={data.deltas.orders}
        sub={`${t.ordersThisMonth.toLocaleString()} this month`}
        tone="indigo"
      />
      <Kpi
        icon={<Users className="h-4 w-4" />}
        label="Users"
        value={formatCompact(t.users)}
        delta={data.deltas.users}
        sub={`${t.activeTenants} active tenants`}
        tone="sky"
      />
      <Kpi
        icon={<Box className="h-4 w-4" />}
        label="Products"
        value={formatCompact(t.products)}
        sub={`${t.tenants} tenants total`}
        tone="violet"
      />
      <Kpi
        icon={<Receipt className="h-4 w-4" />}
        label="Revenue"
        value={formatMoney(t.revenue)}
        delta={data.deltas.revenue}
        sub="All tenants, all time"
        tone="emerald"
      />
      <Kpi
        icon={<FileText className="h-4 w-4" />}
        label="Quotes (devis)"
        value={formatCompact(t.quotes)}
        sub="Across all tenants"
        tone="amber"
      />
      <Kpi
        icon={<FileText className="h-4 w-4" />}
        label="Invoices"
        value={formatCompact(t.invoices)}
        sub="Across all tenants"
        tone="emerald"
      />
      <Kpi
        icon={<Activity className="h-4 w-4" />}
        label="Active users today"
        value={formatCompact(t.activeUsers)}
        delta={data.deltas.activeUsers}
        sub="Distinct users making requests"
        tone="sky"
      />
      <Kpi
        icon={<Zap className="h-4 w-4" />}
        label="API calls today"
        value={formatCompact(t.apiCalls)}
        sub="All tenants combined"
        tone="violet"
      />
    </div>
  );
}

const TONES: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

function Kpi({
  icon,
  label,
  value,
  sub,
  delta,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  tone: keyof typeof TONES | string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONES[tone] ?? TONES.indigo}`}
          >
            {icon}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {label}
          </span>
        </div>
        <DeltaBadge delta={delta} />
      </div>
      <p className="mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

/** `null` means there was no prior value to compare against — shown as "new". */
function DeltaBadge({ delta }: { delta?: number | null }) {
  if (delta === undefined) return null;
  if (delta === null) {
    return <span className="text-[10px] font-semibold text-slate-400">new</span>;
  }
  if (delta === 0) {
    return <span className="text-[10px] font-semibold text-slate-400">—</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
        up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}
      {delta}%
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}

// ─── Trend ───────────────────────────────────────────────────────────────────

function TrendSection({ data }: { data: PlatformOverview }) {
  const labels = data.trend.map((p) => formatDayLabel(p.date));
  const series: TrendSeries[] = [
    {
      key: 'orders',
      label: 'Orders',
      color: COLORS.orders,
      values: data.trend.map((p) => p.orders),
    },
    {
      key: 'quotes',
      label: 'Quotes',
      color: COLORS.quotes,
      values: data.trend.map((p) => p.quotes),
    },
    {
      key: 'invoices',
      label: 'Invoices',
      color: COLORS.invoices,
      values: data.trend.map((p) => p.invoices),
    },
    {
      key: 'activeUsers',
      label: 'Active users',
      color: COLORS.activeUsers,
      values: data.trend.map((p) => p.activeUsers),
    },
  ];
  return <TrendChart labels={labels} series={series} height={220} />;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/15',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/15',
  info: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50',
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-slate-400',
};

function AlertsPanel({ alerts }: { alerts: PlatformAlert[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? alerts : alerts.slice(0, 8);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Attention needed
          </h2>
          <p className="text-xs text-slate-400">
            Quota breaches, dormant tenants, failing requests and collection gaps
          </p>
        </div>
        <Link
          to="/monitoring/tenants"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          All tenant metrics
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {alerts.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Nothing needs attention right now</p>
      ) : (
        <>
          <ul className="space-y-2">
            {visible.map((alert) => (
              <li key={alert.id}>
                <AlertRow alert={alert} />
              </li>
            ))}
          </ul>
          {alerts.length > 8 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {expanded ? 'Show less' : `Show ${alerts.length - 8} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function AlertRow({ alert }: { alert: PlatformAlert }) {
  const body = (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info
      }`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[alert.severity]}`} />
      <div className="min-w-0 flex-1">
        {alert.tenantName && (
          <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
            {alert.tenantName}
          </p>
        )}
        <p className="truncate text-xs text-slate-600 dark:text-slate-400">{alert.message}</p>
      </div>
      {alert.tenantId && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
    </div>
  );

  return alert.tenantId ? (
    <Link to={`/tenants/${alert.tenantId}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Any origin the API reports that we do not have a named colour for. Keeps a
 * newly added order channel visible instead of silently dropping it.
 */
function otherOrigins(byOrigin: Record<string, number>) {
  const known = new Set(['BACKOFFICE', 'ADMIN_POS', 'CLIENT_POS']);
  return Object.entries(byOrigin)
    .filter(([key, value]) => !known.has(key) && value > 0)
    .map(([key, value]) => ({
      label: key,
      value,
      color: COLORS.otherOrigin,
    }));
}
