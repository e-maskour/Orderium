import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Layers,
  List,
  Play,
  RefreshCw,
  ShieldAlert,
  Sprout,
  Terminal,
  Users,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useAllSeederStatus,
  useRunPendingForTenant,
  useRunSeederFleet,
  useRunSeederForTenant,
  useSeederLogs,
} from '../hooks/useSeeders';
import { SeederRunDialog } from '../components/SeederRunDialog';
import type {
  SeederHealth,
  SeederOptions,
  SeederPivot,
  SeederRunLog,
  SeederStatusInfo,
  TenantSeederStatus,
} from '../types/seeder';

// ─────────────────────────────── helpers ─────────────────────────────────────

function fmt(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtDate(s: string | null): string {
  if (!s) return 'never';
  return new Date(s).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Seeders are convergent, so "pending" means the tenant is missing some of
 * what the seeder declares — not that the seeder has never run here.
 */
const HEALTH_LABEL: Record<SeederHealth, string> = {
  converged: 'Converged',
  pending: 'Needs seeding',
  error: 'Unreadable',
};

// ─────────────────────────────── badges ──────────────────────────────────────

function HealthBadge({ health }: { health: SeederHealth }) {
  const cfg: Record<SeederHealth, { cls: string; dot: string }> = {
    converged: {
      cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    },
    pending: {
      cls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400',
      dot: 'bg-amber-400',
    },
    error: {
      cls: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400',
      dot: 'bg-red-500',
    },
  };
  const { cls, dot } = cfg[health];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dot} ${health === 'pending' ? 'animate-pulse' : ''}`}
      />
      {HEALTH_LABEL[health]}
    </span>
  );
}

function LogStatusBadge({ status }: { status: SeederRunLog['status'] }) {
  return status === 'success' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400">
      <CheckCircle className="h-3 w-3" /> Success
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/30 dark:text-red-400">
      <XCircle className="h-3 w-3" /> Failed
    </span>
  );
}

function OperationBadge({ op }: { op: SeederRunLog['operation'] }) {
  const cfg: Record<SeederRunLog['operation'], string> = {
    run: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-400',
    'run-tenant': 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-400',
    'run-fleet':
      'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-400',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${cfg[op]}`}
    >
      {op}
    </span>
  );
}

// ────────────────────────────── seeder line ──────────────────────────────────

interface SeederLineProps {
  info: SeederStatusInfo;
  onRun: () => void;
  onRunFleet?: () => void;
  busy: boolean;
  /** Slug shown on the seeder-first pivot, where the tenant is the variable. */
  tenantLabel?: string;
}

function SeederLine({ info, onRun, onRunFleet, busy, tenantLabel }: SeederLineProps) {
  const icon =
    info.status === 'converged' ? (
      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
    ) : info.status === 'error' ? (
      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
    ) : (
      <Clock className="h-4 w-4 shrink-0 text-amber-500" />
    );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700/50 dark:bg-slate-800/40">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {tenantLabel ?? info.name}
            </span>
            {info.privileged && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 ring-1 ring-inset ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-400">
                <ShieldAlert className="h-3 w-3" /> Privileged
              </span>
            )}
          </div>
          <p
            className={`mt-0.5 truncate text-xs ${
              info.status === 'error'
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
            title={info.detail}
          >
            {info.detail}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            Last run {fmtDate(info.lastRunAt)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        {onRunFleet && (
          <button
            onClick={onRunFleet}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:bg-slate-800 dark:text-violet-300 dark:hover:bg-slate-700"
          >
            <Users className="h-3.5 w-3.5" /> All tenants
          </button>
        )}
        <button
          onClick={onRun}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" /> Run
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────── tenant-first row ───────────────────────────────

interface TenantRowProps {
  status: TenantSeederStatus;
  busy: boolean;
  onRunSeeder: (tenant: TenantSeederStatus, info: SeederStatusInfo) => void;
  onRunFleet: (info: SeederStatusInfo) => void;
  onRunPending: (tenant: TenantSeederStatus) => void;
}

function TenantSeederRow({ status, busy, onRunSeeder, onRunFleet, onRunPending }: TenantRowProps) {
  const [expanded, setExpanded] = useState(status.health !== 'converged');

  const runnablePending = status.seeders.filter(
    (s) => s.status === 'pending' && !s.privileged,
  ).length;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        status.health === 'converged'
          ? 'border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-800/40'
          : 'border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-900/10'
      }`}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {status.tenantName}
            </p>
            <p className="truncate text-xs text-slate-400">{status.tenantSlug}</p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {status.pendingCount > 0 || status.errorCount > 0
              ? `${status.pendingCount + status.errorCount} of ${status.totalCount} need attention`
              : `all ${status.totalCount} converged`}
          </span>
          <HealthBadge health={status.health} />
          {runnablePending > 0 && (
            <button
              onClick={() => onRunPending(status)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" /> Run {runnablePending} pending
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-slate-100 px-4 py-3 dark:border-slate-700/50">
          {status.seeders.map((info) => (
            <SeederLine
              key={info.key}
              info={info}
              busy={busy}
              onRun={() => onRunSeeder(status, info)}
              onRunFleet={info.privileged ? undefined : () => onRunFleet(info)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────── seeder-first row ───────────────────────────────

interface PivotRowProps {
  pivot: SeederPivot;
  busy: boolean;
  onRunSeeder: (tenant: TenantSeederStatus, info: SeederStatusInfo) => void;
  onRunFleet: (info: SeederStatusInfo) => void;
}

function SeederPivotRow({ pivot, busy, onRunSeeder, onRunFleet }: PivotRowProps) {
  const drifted = [...pivot.pendingTenants, ...pivot.errorTenants];
  const [expanded, setExpanded] = useState(drifted.length > 0);

  const infoFor = (tenant: TenantSeederStatus): SeederStatusInfo | undefined =>
    tenant.seeders.find((s) => s.key === pivot.key);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        drifted.length === 0
          ? 'border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-800/40'
          : 'border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-900/10'
      }`}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {pivot.name}
              </p>
              {pivot.privileged && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 ring-1 ring-inset ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-400">
                  <ShieldAlert className="h-3 w-3" /> Privileged
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {pivot.description}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {drifted.length === 0
              ? `converged on all ${pivot.totalTenants}`
              : `drifted on ${drifted.length} of ${pivot.totalTenants}`}
          </span>
          {drifted.length === 0 ? (
            <HealthBadge health="converged" />
          ) : (
            <HealthBadge health={pivot.errorTenants.length ? 'error' : 'pending'} />
          )}
          {pivot.pendingTenants.length > 0 && !pivot.privileged && (
            <button
              onClick={() => {
                const first = infoFor(pivot.pendingTenants[0]);
                if (first) onRunFleet(first);
              }}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              <Users className="h-3.5 w-3.5" /> Run on all tenants
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-slate-100 px-4 py-3 dark:border-slate-700/50">
          {pivot.privileged && (
            <p className="flex items-start gap-1.5 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800 dark:bg-violet-900/20 dark:text-violet-300">
              <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
              Runs one tenant at a time — it needs credentials unique to each tenant, so there is no
              fleet-wide action.
            </p>
          )}
          {drifted.length === 0 ? (
            <p className="px-1 py-2 text-xs text-slate-400">
              Every tenant matches this seeder. Nothing to do.
            </p>
          ) : (
            drifted.map((tenant) => {
              const info = infoFor(tenant);
              if (!info) return null;
              return (
                <SeederLine
                  key={tenant.tenantId}
                  info={info}
                  busy={busy}
                  tenantLabel={tenant.tenantName}
                  onRun={() => onRunSeeder(tenant, info)}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────── logs ──────────────────────────────────────

function LogRow({ log }: { log: SeederRunLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-100 bg-white dark:border-slate-700/50 dark:bg-slate-800/40">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full flex-col gap-2 px-3 py-2.5 text-left sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <LogStatusBadge status={log.status} />
          <OperationBadge op={log.operation} />
          <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
            {log.seederName}
          </span>
          <span className="truncate text-xs text-slate-400">{log.tenantSlug}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
          <span>{fmt(log.durationMs)}</span>
          <span>{fmtDate(log.executedAt)}</span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-1.5 border-t border-slate-100 px-3 py-2.5 text-xs dark:border-slate-700/50">
          <p className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Result: </span>
            {log.detail ?? '—'}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Created / pruned: </span>
            {log.created} / {log.pruned}
          </p>
          {log.optionsUsed && log.optionsUsed.length > 0 && (
            <p className="text-slate-600 dark:text-slate-300">
              <span className="text-slate-400">Options supplied: </span>
              {log.optionsUsed.join(', ')}
              <span className="text-slate-400"> (names only — values are never stored)</span>
            </p>
          )}
          {log.errorMessage && (
            <p className="rounded bg-red-50 px-2 py-1.5 font-mono text-[11px] text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {log.errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LogPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [filterStatus, setFilterStatus] = useState('');
  const { data: logs, isLoading } = useSeederLogs({
    limit: 50,
    status: filterStatus || undefined,
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-800/40">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Terminal className="h-4 w-4 text-slate-400" /> Run history
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 dark:border-slate-700/50">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {isLoading ? (
            <p className="py-4 text-center text-xs text-slate-400">Loading history…</p>
          ) : !logs || logs.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">No seeder runs recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────── page ────────────────────────────────────────

type ViewMode = 'tenant' | 'seeder';

type PendingAction =
  | { type: 'run'; tenant: TenantSeederStatus; info: SeederStatusInfo }
  | { type: 'run-pending'; tenant: TenantSeederStatus; count: number }
  | { type: 'run-fleet'; info: SeederStatusInfo; tenantCount: number }
  | null;

export function SeederManager() {
  const { data: statuses, isLoading, isError, refetch } = useAllSeederStatus();
  const runSeeder = useRunSeederForTenant();
  const runPending = useRunPendingForTenant();
  const runFleet = useRunSeederFleet();

  const [view, setView] = useState<ViewMode>('tenant');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [filterHealth, setFilterHealth] = useState<SeederHealth | 'all'>('all');

  const busy = runSeeder.isPending || runPending.isPending || runFleet.isPending;

  const stats = useMemo(() => {
    if (!statuses) return null;
    return {
      total: statuses.length,
      converged: statuses.filter((s) => s.health === 'converged').length,
      pending: statuses.filter((s) => s.health === 'pending').length,
      error: statuses.filter((s) => s.health === 'error').length,
    };
  }, [statuses]);

  const filteredStatuses = useMemo(() => {
    if (!statuses) return [];
    if (filterHealth === 'all') return statuses;
    return statuses.filter((s) => s.health === filterHealth);
  }, [statuses, filterHealth]);

  // The seeder-first view is the same payload transposed — no second request.
  const pivots = useMemo((): SeederPivot[] => {
    if (!statuses || statuses.length === 0) return [];
    const first = statuses[0];

    return first.seeders.map((seeder) => {
      const pendingTenants: TenantSeederStatus[] = [];
      const errorTenants: TenantSeederStatus[] = [];
      let convergedCount = 0;

      for (const tenant of statuses) {
        const info = tenant.seeders.find((s) => s.key === seeder.key);
        if (!info) continue;
        if (info.status === 'pending') pendingTenants.push(tenant);
        else if (info.status === 'error') errorTenants.push(tenant);
        else convergedCount++;
      }

      return {
        key: seeder.key,
        name: seeder.name,
        description: seeder.description,
        privileged: seeder.privileged,
        options: seeder.options,
        pendingTenants,
        errorTenants,
        convergedCount,
        totalTenants: statuses.length,
      };
    });
  }, [statuses]);

  // ── dialog copy ───────────────────────────────────────────────────────────

  const dialog = useMemo(() => {
    if (!pendingAction) return null;

    if (pendingAction.type === 'run') {
      const { tenant, info } = pendingAction;
      return {
        title: `Run ${info.name} — ${tenant.tenantName}`,
        description: `${info.description} Current state: ${info.detail}.`,
        options: info.options,
        label: 'Run seeder',
        variant: info.privileged ? ('danger' as const) : ('warning' as const),
      };
    }

    if (pendingAction.type === 'run-pending') {
      const { tenant, count } = pendingAction;
      return {
        title: `Run ${count} pending seeder(s) — ${tenant.tenantName}`,
        description:
          'Runs every seeder this tenant has drifted from, in dependency order. ' +
          'Privileged seeders are skipped — run those individually.',
        options: [],
        label: 'Run pending',
        variant: 'warning' as const,
      };
    }

    const { info, tenantCount } = pendingAction;
    return {
      title: `Run ${info.name} on all tenants`,
      description: `Runs this seeder against every tenant on the platform (${tenantCount}). Tenants already converged are a no-op. Runs sequentially; a tenant that fails does not stop the rest.`,
      options: info.options,
      label: 'Run on all tenants',
      variant: 'danger' as const,
    };
  }, [pendingAction]);

  // ── actions ───────────────────────────────────────────────────────────────

  const handleConfirm = async (values: SeederOptions) => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);

    try {
      if (action.type === 'run') {
        const log = await runSeeder.mutateAsync({
          tenantId: action.tenant.tenantId,
          key: action.info.key,
          options: values,
        });
        if (log.status === 'failed') {
          toast.error(`${action.info.name} failed: ${log.errorMessage ?? 'Unknown error'}`, {
            duration: 7000,
          });
        } else {
          toast.success(`${action.info.name}: ${log.detail ?? 'done'}`);
        }
        return;
      }

      if (action.type === 'run-pending') {
        const logs = await runPending.mutateAsync({ tenantId: action.tenant.tenantId });
        const failed = logs.filter((l) => l.status === 'failed');
        if (failed.length > 0) {
          toast.error(
            `${logs.length - failed.length} succeeded, ${failed.length} failed. Check run history.`,
            { duration: 7000 },
          );
        } else {
          toast.success(`${logs.length} seeder(s) run on ${action.tenant.tenantName}`);
        }
        return;
      }

      const results = await runFleet.mutateAsync({
        key: action.info.key,
        options: values,
      });
      const failed = results.filter((r) => r.status === 'failed').length;
      const created = results.reduce((n, r) => n + r.created, 0);
      if (failed > 0) {
        toast.error(`${results.length - failed} tenants OK, ${failed} failed. Check run history.`, {
          duration: 7000,
        });
      } else {
        toast.success(
          `${action.info.name} applied across ${results.length} tenants (${created} rows created)`,
        );
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Operation failed. Check the run history for details.';
      toast.error(message, { duration: 7000 });
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-400">Checking seeder drift across tenants…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 px-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Failed to load seeder status
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Check the API connection or super-admin key.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 px-6 py-6 lg:px-8 lg:py-8">
      {/* ══════════ HEADER ══════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm shadow-emerald-500/30">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Seeder Manager
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Seeders declare data that ought to exist. A tenant is “converged” when it has everything
            the seeder declares — so a seeder that ran last year still shows as pending once you add
            new defaults to it.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {/* view toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setView('tenant')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                view === 'tenant'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <List className="h-3.5 w-3.5" /> By tenant
            </button>
            <button
              onClick={() => setView('seeder')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                view === 'seeder'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> By seeder
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ══════════ STATS ══════════ */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Total tenants',
              value: stats.total,
              icon: <Users className="h-4 w-4" />,
              color: 'text-slate-500 bg-slate-100 dark:bg-slate-700',
            },
            {
              label: 'Converged',
              value: stats.converged,
              icon: <CheckCircle className="h-4 w-4" />,
              color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30',
            },
            {
              label: 'Need seeding',
              value: stats.pending,
              icon: <Clock className="h-4 w-4" />,
              color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
            },
            {
              label: 'Unreadable',
              value: stats.error,
              icon: <XCircle className="h-4 w-4" />,
              color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/40"
            >
              <div
                className={`mb-2 inline-flex items-center justify-center rounded-lg p-2 ${s.color}`}
              >
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ══════════ BODY ══════════ */}
      {view === 'tenant' ? (
        <>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterHealth}
              onChange={(e) => setFilterHealth(e.target.value as SeederHealth | 'all')}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">All tenants</option>
              <option value="pending">Need seeding</option>
              <option value="converged">Converged</option>
              <option value="error">Unreadable</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredStatuses.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-400 dark:border-slate-700/60 dark:bg-slate-800/40">
                No tenants match this filter.
              </p>
            ) : (
              filteredStatuses.map((status) => (
                <TenantSeederRow
                  key={status.tenantId}
                  status={status}
                  busy={busy}
                  onRunSeeder={(tenant, info) => setPendingAction({ type: 'run', tenant, info })}
                  onRunFleet={(info) =>
                    setPendingAction({
                      type: 'run-fleet',
                      info,
                      tenantCount: statuses?.length ?? 0,
                    })
                  }
                  onRunPending={(tenant) =>
                    setPendingAction({
                      type: 'run-pending',
                      tenant,
                      count: tenant.seeders.filter((s) => s.status === 'pending' && !s.privileged)
                        .length,
                    })
                  }
                />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {pivots.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-400 dark:border-slate-700/60 dark:bg-slate-800/40">
              No tenants to report on.
            </p>
          ) : (
            pivots.map((pivot) => (
              <SeederPivotRow
                key={pivot.key}
                pivot={pivot}
                busy={busy}
                onRunSeeder={(tenant, info) => setPendingAction({ type: 'run', tenant, info })}
                onRunFleet={(info) =>
                  setPendingAction({
                    type: 'run-fleet',
                    info,
                    tenantCount: statuses?.length ?? 0,
                  })
                }
              />
            ))
          )}
        </div>
      )}

      {/* ══════════ LOGS ══════════ */}
      <LogPanel open={logsOpen} onToggle={() => setLogsOpen((o) => !o)} />

      {dialog && (
        <SeederRunDialog
          open
          title={dialog.title}
          description={dialog.description}
          options={dialog.options}
          confirmLabel={dialog.label}
          confirmVariant={dialog.variant}
          loading={busy}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
