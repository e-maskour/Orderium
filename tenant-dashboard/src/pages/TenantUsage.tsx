import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Download, Search, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useTenantMetrics, useExportMetrics } from '../hooks/useMetrics';
import { StatusBadge } from '../components/StatusBadge';
import { SkeletonListItem } from '../components/Skeleton';
import { formatBytes, formatCompact } from '../utils/format';
import type {
  TenantMetricRow,
  TenantMetricSortKey,
  TenantMetricsListParams,
} from '../types/metrics';

interface Column {
  key: TenantMetricSortKey | 'quota' | 'risk' | 'origin';
  label: string;
  /** Only whitelisted keys can be sent to the API as a sort key. */
  sortable: boolean;
  align?: 'left' | 'right';
  hint?: string;
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Tenant', sortable: true, align: 'left' },
  { key: 'ordersTotal', label: 'Orders', sortable: true, align: 'right' },
  {
    key: 'origin',
    label: 'Back-office / Admin POS / Client POS',
    sortable: false,
    align: 'right',
    hint: 'Order split by entry point',
  },
  { key: 'usersTotal', label: 'Users', sortable: true, align: 'right' },
  { key: 'productsTotal', label: 'Products', sortable: true, align: 'right' },
  { key: 'quotesTotal', label: 'Devis', sortable: true, align: 'right' },
  { key: 'invoicesTotal', label: 'Invoices', sortable: true, align: 'right' },
  {
    key: 'activeUsers',
    label: 'DAU',
    sortable: true,
    align: 'right',
    hint: 'Distinct users active today',
  },
  { key: 'apiCalls', label: 'API calls', sortable: true, align: 'right' },
  { key: 'dbSizeBytes', label: 'Footprint', sortable: true, align: 'right' },
  { key: 'quota', label: 'Quota', sortable: false, align: 'right' },
  { key: 'risk', label: 'Risk', sortable: false, align: 'right' },
];

export function TenantUsage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState<TenantMetricSortKey>('ordersTotal');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const params: TenantMetricsListParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status === 'all' ? undefined : status,
      sortBy,
      sortOrder,
    }),
    [search, status, sortBy, sortOrder],
  );

  const { data, isLoading } = useTenantMetrics(params);
  const exportCsv = useExportMetrics();

  const toggleSort = (key: TenantMetricSortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(key);
      // Names read best A→Z; every other column is most useful biggest-first.
      setSortOrder(key === 'name' ? 'ASC' : 'DESC');
    }
  };

  return (
    <div className="animate-fade-in space-y-6 px-6 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Tenant usage
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Every tenant, every metric — sortable, filterable, exportable
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv.mutate(params)}
          disabled={exportCsv.isPending}
          className="btn-secondary"
        >
          <Download className="h-4 w-4" />
          {exportCsv.isPending ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants by name or slug…"
            className="input pl-9"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {/* Wide table: scrolls inside its own container so the page body never
            scrolls horizontally. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    title={col.hint}
                    className={`whitespace-nowrap px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key as TenantMetricSortKey)}
                        className="inline-flex items-center gap-1 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {col.label}
                        {sortBy === col.key &&
                          (sortOrder === 'ASC' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          ))}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={COLUMNS.length} className="px-3 py-1">
                      <SkeletonListItem />
                    </td>
                  </tr>
                ))
              ) : !data?.length ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-3 py-10 text-center text-sm text-slate-400"
                  >
                    No tenants match these filters
                  </td>
                </tr>
              ) : (
                data.map((row) => <MetricRow key={row.tenantId} row={row} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ row }: { row: TenantMetricRow }) {
  const origin = row.ordersByOrigin ?? {};
  return (
    <tr className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
      <td className="px-3 py-3">
        <Link to={`/tenants/${row.tenantId}`} className="group block">
          <span className="font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
            {row.name}
          </span>
          <div className="mt-0.5 flex items-center gap-2">
            <StatusBadge status={row.status} />
            {row.collectionError && (
              <span
                title={row.collectionError}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500"
              >
                <TriangleAlert className="h-3 w-3" />
                collection failed
              </span>
            )}
          </div>
        </Link>
      </td>

      <Num value={row.ordersTotal} sub={`${row.orders30d.toLocaleString()} in 30d`} />

      <td className="px-3 py-3 text-right">
        <span className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
          {(origin.BACKOFFICE ?? 0).toLocaleString()}
          <span className="mx-1 text-slate-300 dark:text-slate-600">/</span>
          {(origin.ADMIN_POS ?? 0).toLocaleString()}
          <span className="mx-1 text-slate-300 dark:text-slate-600">/</span>
          {(origin.CLIENT_POS ?? 0).toLocaleString()}
        </span>
      </td>

      <Num value={row.usersTotal} sub={`${row.usersAdmin} staff`} />
      <Num value={row.productsTotal} />
      <Num value={row.quotesTotal} />
      <Num
        value={row.invoicesTotal}
        sub={row.invoicesUnpaid > 0 ? `${row.invoicesUnpaid} unpaid` : undefined}
      />
      <Num value={row.activeUsers} />
      <Num value={row.apiCalls} compact />

      <td className="px-3 py-3 text-right">
        <span className="text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">
          {formatBytes(row.dbSizeBytes)}
        </span>
        <p className="text-[10px] text-slate-400">+{formatBytes(row.storageBytes)} files</p>
      </td>

      <td className="px-3 py-3 text-right">
        <QuotaPill row={row} />
      </td>

      <td className="px-3 py-3 text-right">
        <RiskPill score={row.riskScore} reasons={row.riskReasons} />
      </td>
    </tr>
  );
}

function Num({ value, sub, compact }: { value: number; sub?: string; compact?: boolean }) {
  return (
    <td className="px-3 py-3 text-right">
      <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
        {compact ? formatCompact(value) : value.toLocaleString()}
      </span>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </td>
  );
}

/** Worst quota line across users / products / orders / storage. */
function QuotaPill({ row }: { row: TenantMetricRow }) {
  const pct = row.quota.worstPct;
  if (pct === null) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const exceeded =
    row.quota.users.exceeded ||
    row.quota.products.exceeded ||
    row.quota.ordersPerMonth.exceeded ||
    row.quota.storageMb.exceeded;

  const tone = exceeded
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    : pct >= 80
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

  return (
    <span
      title={quotaTooltip(row)}
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${tone}`}
    >
      {Math.round(pct)}%
    </span>
  );
}

function quotaTooltip(row: TenantMetricRow): string {
  const q = row.quota;
  return [
    `Staff seats: ${q.users.used}/${q.users.limit || '∞'}`,
    `Products: ${q.products.used}/${q.products.limit || '∞'}`,
    `Orders this month: ${q.ordersPerMonth.used}/${q.ordersPerMonth.limit || '∞'}`,
    `Storage: ${q.storageMb.used}/${q.storageMb.limit || '∞'} MB`,
  ].join('\n');
}

/**
 * Churn-risk score with its reasons in the tooltip. The number alone would be
 * an opaque verdict; the reasons make it something an operator can act on.
 */
function RiskPill({ score, reasons }: { score: number; reasons: string[] }) {
  if (score === 0) {
    return <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
  }
  const tone =
    score >= 60
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : score >= 30
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

  return (
    <span
      title={reasons.join('\n')}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${tone}`}
    >
      {score >= 60 && <ShieldAlert className="h-3 w-3" />}
      {score}
    </span>
  );
}
