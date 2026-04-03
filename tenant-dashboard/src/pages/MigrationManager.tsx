import { useState, useMemo } from 'react';
import {
  Database,
  RefreshCw,
  Play,
  RotateCcw,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  List,
  ChevronUp,
  Filter,
  X,
  Terminal,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useAllMigrationStatus,
  useMigrationLogs,
  useRunMigrationsForTenant,
  useRunAllMigrations,
  useRevertMigrationForTenant,
} from '../hooks/useMigrations';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { TenantMigrationStatus, MigrationRunLog, MigrationHealth } from '../types/migration';

// ─────────────────────────────── helpers ─────────────────────────────────────

function fmt(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtTimestamp(ts: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─────────────────────────────── sub-components ──────────────────────────────

function HealthBadge({ health }: { health: MigrationHealth }) {
  const cfg: Record<MigrationHealth, { cls: string; dot: string; label: string }> = {
    'up-to-date': {
      cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400',
      dot: 'bg-emerald-500',
      label: 'Up to date',
    },
    pending: {
      cls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400',
      dot: 'bg-amber-400',
      label: 'Pending',
    },
    failed: {
      cls: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400',
      dot: 'bg-red-500',
      label: 'Failed',
    },
  };
  const { cls, dot, label } = cfg[health];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dot} ${health === 'pending' ? 'animate-pulse' : ''}`}
      />
      {label}
    </span>
  );
}

function LogStatusBadge({ status }: { status: MigrationRunLog['status'] }) {
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

function OperationBadge({ op }: { op: MigrationRunLog['operation'] }) {
  const cfg = {
    run: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-400',
    revert:
      'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/30 dark:text-orange-400',
    'run-all':
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

// ─────────────────────────── TenantMigrationRow ──────────────────────────────

interface TenantRowProps {
  status: TenantMigrationStatus;
  onRun: (id: number) => void;
  onRevert: (id: number) => void;
  isRunning: boolean;
  isReverting: boolean;
}

function TenantMigrationRow({ status, onRun, onRevert, isRunning, isReverting }: TenantRowProps) {
  const [expanded, setExpanded] = useState(status.health !== 'up-to-date');

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        status.health === 'failed'
          ? 'border-red-200 bg-red-50/40 dark:border-red-800/50 dark:bg-red-900/10'
          : status.health === 'pending'
            ? 'border-amber-200 bg-amber-50/30 dark:border-amber-800/50 dark:bg-amber-900/10'
            : 'border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-800/40'
      }`}
    >
      {/* Row header */}
      <button
        className="flex w-full items-center gap-4 p-4 text-left"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {/* Tenant avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-sm">
          {status.tenantName.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {status.tenantName}
            </span>
            <span className="text-xs text-slate-400 font-mono">{status.tenantSlug}</span>
            <HealthBadge health={status.health} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {status.appliedCount} applied · {status.pendingCount} pending · {status.totalCount}{' '}
            total
          </p>
        </div>

        {/* Progress bar */}
        <div className="hidden sm:block w-28 shrink-0">
          <div className="mb-1 flex justify-between text-[10px] font-medium text-slate-400">
            <span>
              {status.totalCount > 0
                ? Math.round((status.appliedCount / status.totalCount) * 100)
                : 0}
              %
            </span>
            <span>
              {status.appliedCount}/{status.totalCount}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${
                status.health === 'failed'
                  ? 'bg-red-500'
                  : status.health === 'pending'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{
                width: `${status.totalCount > 0 ? (status.appliedCount / status.totalCount) * 100 : 100}%`,
              }}
            />
          </div>
        </div>

        <div className="ml-2 shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 dark:border-slate-700/50">
          {/* Failed log banner */}
          {status.lastFailedLog && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800/50 dark:bg-red-900/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                  Last run failed
                </p>
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-300 break-words">
                  {status.lastFailedLog.errorMessage ?? 'Unknown error'}
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {status.pendingCount > 0 && (
              <button
                onClick={() => onRun(status.tenantId)}
                disabled={isRunning || isReverting}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {isRunning ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" />
                    Run {status.pendingCount} pending
                  </>
                )}
              </button>
            )}
            {status.appliedCount > 0 && (
              <button
                onClick={() => onRevert(status.tenantId)}
                disabled={isRunning || isReverting}
                className="flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-60 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30"
              >
                {isReverting ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-orange-600 border-t-transparent" />
                    Reverting…
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3" />
                    Revert last
                  </>
                )}
              </button>
            )}
          </div>

          {/* Migration table */}
          {status.migrations.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/60">
                    <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">
                      Migration
                    </th>
                    <th className="hidden px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 sm:table-cell">
                      Timestamp
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {status.migrations.map((m) => (
                    <tr
                      key={m.name}
                      className={`border-b border-slate-100 last:border-0 dark:border-slate-700/40 ${
                        m.status === 'pending' ? 'bg-amber-50/50 dark:bg-amber-900/5' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                        {m.name}
                      </td>
                      <td className="hidden px-3 py-2 text-slate-500 dark:text-slate-400 sm:table-cell whitespace-nowrap">
                        {fmtTimestamp(m.timestamp)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {m.status === 'applied' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-semibold">Applied</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-semibold">Pending</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-400 italic">
              No migrations registered for this tenant.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────── LogPanel ────────────────────────────────────

interface LogPanelProps {
  open: boolean;
  onToggle: () => void;
}

function LogPanel({ open, onToggle }: LogPanelProps) {
  const [filterStatus, setFilterStatus] = useState('');

  const { data: logs, isLoading } = useMigrationLogs({
    limit: 50,
    status: filterStatus || undefined,
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/40">
      {/* Panel header */}
      <button
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <Terminal className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
        <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Execution Logs
        </span>
        {logs && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            {logs.length}
          </span>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700/50">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-medium">Filters</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            {filterStatus && (
              <button
                onClick={() => setFilterStatus('')}
                className="flex items-center gap-1 rounded text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {/* Log table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
              <Terminal className="h-8 w-8 opacity-30" />
              <p className="text-sm">No logs yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/60">
                    <th className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">
                      Tenant
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">
                      Operation
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="hidden px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 sm:table-cell">
                      Migrations
                    </th>
                    <th className="hidden px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 sm:table-cell">
                      Duration
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogRow({ log }: { log: MigrationRunLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 last:border-0 dark:border-slate-700/40 dark:hover:bg-slate-800/60 ${
          log.status === 'failed' ? 'bg-red-50/40 dark:bg-red-900/10' : ''
        }`}
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200 font-medium">
          <div>{log.tenantName}</div>
          <div className="text-[10px] font-mono text-slate-400">{log.tenantSlug}</div>
        </td>
        <td className="px-4 py-2.5">
          <OperationBadge op={log.operation} />
        </td>
        <td className="px-4 py-2.5">
          <LogStatusBadge status={log.status} />
        </td>
        <td className="hidden px-4 py-2.5 text-slate-500 dark:text-slate-400 sm:table-cell">
          {log.migrationsExecuted?.length ?? 0} migration
          {(log.migrationsExecuted?.length ?? 0) !== 1 ? 's' : ''}
        </td>
        <td className="hidden px-4 py-2.5 text-slate-500 dark:text-slate-400 sm:table-cell whitespace-nowrap">
          {fmt(log.durationMs)}
        </td>
        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(log.executedAt)}</td>
      </tr>
      {expanded &&
        (log.errorMessage || (log.migrationsExecuted && log.migrationsExecuted.length > 0)) && (
          <tr className="bg-slate-50 dark:bg-slate-800/60">
            <td colSpan={6} className="px-4 py-3">
              {log.errorMessage && (
                <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 dark:border-red-800/50 dark:bg-red-900/20">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  <p className="text-[11px] text-red-600 dark:text-red-300 break-all">
                    {log.errorMessage}
                  </p>
                </div>
              )}
              {log.migrationsExecuted && log.migrationsExecuted.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {log.migrationsExecuted.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    >
                      <ArrowRight className="h-2.5 w-2.5" />
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </td>
          </tr>
        )}
    </>
  );
}

// ─────────────────────────────── main page ───────────────────────────────────

type PendingAction =
  | { type: 'run'; tenantId: number; tenantName: string }
  | { type: 'revert'; tenantId: number; tenantName: string }
  | { type: 'run-all' }
  | null;

export function MigrationManager() {
  const { data: statuses, isLoading, isError, refetch } = useAllMigrationStatus();
  const runForTenant = useRunMigrationsForTenant();
  const revertForTenant = useRevertMigrationForTenant();
  const runAll = useRunAllMigrations();

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [filterHealth, setFilterHealth] = useState<MigrationHealth | 'all'>('all');

  const stats = useMemo(() => {
    if (!statuses) return null;
    return {
      total: statuses.length,
      upToDate: statuses.filter((s) => s.health === 'up-to-date').length,
      pending: statuses.filter((s) => s.health === 'pending').length,
      failed: statuses.filter((s) => s.health === 'failed').length,
    };
  }, [statuses]);

  const filteredStatuses = useMemo(() => {
    if (!statuses) return [];
    if (filterHealth === 'all') return statuses;
    return statuses.filter((s) => s.health === filterHealth);
  }, [statuses, filterHealth]);

  const allUpToDate = stats?.pending === 0 && stats?.failed === 0;

  // ── confirm dialog state ──────────────────────────────────────────────────
  const confirmConfig = useMemo((): {
    title: string;
    description: string;
    label: string;
    variant: 'danger' | 'warning' | 'default';
  } | null => {
    if (!pendingAction) return null;
    if (pendingAction.type === 'run') {
      return {
        title: `Run pending migrations — ${pendingAction.tenantName}`,
        description: `This will apply all pending database migrations for tenant "${pendingAction.tenantName}". This action modifies the database schema and cannot be automatically undone.`,
        label: 'Run migrations',
        variant: 'warning',
      };
    }
    if (pendingAction.type === 'revert') {
      return {
        title: `Revert last migration — ${pendingAction.tenantName}`,
        description: `This will reverse the most recently applied migration for tenant "${pendingAction.tenantName}". ⚠️ This may cause data loss and could break the application if it is running. Proceed only if you know what you are doing.`,
        label: 'Revert migration',
        variant: 'danger',
      };
    }
    return {
      title: 'Run all tenant migrations',
      description: `This will apply all pending database migrations across EVERY tenant on the platform. Migrations are run sequentially. If a tenant fails, others will still be processed. This action modifies production schemas.`,
      label: 'Run all migrations',
      variant: 'warning',
    };
  }, [pendingAction]);

  const handleConfirm = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);

    try {
      if (action.type === 'run') {
        await runForTenant.mutateAsync(action.tenantId);
        toast.success(`Migrations completed for ${action.tenantName}`);
      } else if (action.type === 'revert') {
        const log = await revertForTenant.mutateAsync(action.tenantId);
        if (log.status === 'failed') {
          toast.error(`Revert failed: ${log.errorMessage ?? 'Unknown error'}`);
        } else {
          toast.success(`Migration reverted for ${action.tenantName}`);
        }
      } else {
        const results = await runAll.mutateAsync();
        const failed = results.filter((r) => r.status === 'failed').length;
        const succeeded = results.filter((r) => r.status === 'success').length;
        if (failed > 0) {
          toast.error(`${succeeded} tenants OK, ${failed} failed. Check logs.`, { duration: 6000 });
        } else {
          toast.success(`All migrations applied across ${succeeded} tenants`);
        }
      }
    } catch {
      toast.error('Operation failed. Check the logs for details.');
    }
  };

  const isAnyMutating = runForTenant.isPending || revertForTenant.isPending || runAll.isPending;

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading migration status…</p>
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
            Failed to load migration status
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
    <div className="space-y-6 px-6 py-6 lg:px-8 lg:py-8 animate-fade-in">
      {/* ══════════ HEADER ══════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-500/30">
              <Database className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Migration Manager
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View and manage database migrations across all tenants without terminal access.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ══════════ STATS ══════════ */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Total tenants',
              value: stats.total,
              icon: <Database className="h-4 w-4" />,
              color: 'text-slate-500 bg-slate-100 dark:bg-slate-700',
            },
            {
              label: 'Up to date',
              value: stats.upToDate,
              icon: <CheckCircle className="h-4 w-4" />,
              color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30',
            },
            {
              label: 'Pending',
              value: stats.pending,
              icon: <Clock className="h-4 w-4" />,
              color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
            },
            {
              label: 'Failed',
              value: stats.failed,
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
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════ GLOBAL ACTIONS BAR ══════════ */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4 ${
          allUpToDate
            ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-900/10'
            : 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-800/50 dark:bg-indigo-900/10'
        }`}
      >
        <div className="flex items-center gap-3">
          {allUpToDate ? (
            <>
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  All tenants are up to date
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  No pending migrations across {stats?.total} tenants.
                </p>
              </div>
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                  {(stats?.pending ?? 0) + (stats?.failed ?? 0)} tenant
                  {(stats?.pending ?? 0) + (stats?.failed ?? 0) !== 1 ? 's' : ''} need attention
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  {stats?.pending} pending · {stats?.failed} failed
                </p>
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setPendingAction({ type: 'run-all' })}
          disabled={allUpToDate || isAnyMutating}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {runAll.isPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Running all tenants…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Run all tenants
            </>
          )}
        </button>
      </div>

      {/* ══════════ FILTER BAR ══════════ */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <List className="h-3.5 w-3.5" /> Filter
        </span>
        {(['all', 'up-to-date', 'pending', 'failed'] as const).map((h) => (
          <button
            key={h}
            onClick={() => setFilterHealth(h)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filterHealth === h
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {h === 'all'
              ? `All (${stats?.total ?? 0})`
              : h === 'up-to-date'
                ? `Up to date (${stats?.upToDate ?? 0})`
                : h === 'pending'
                  ? `Pending (${stats?.pending ?? 0})`
                  : `Failed (${stats?.failed ?? 0})`}
          </button>
        ))}
      </div>

      {/* ══════════ TENANT LIST ══════════ */}
      <div className="space-y-2">
        {filteredStatuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-12 text-slate-400 dark:border-slate-700/60 dark:bg-slate-800/40">
            <Database className="h-10 w-10 opacity-30" />
            <p className="text-sm">No tenants match this filter</p>
          </div>
        ) : (
          filteredStatuses.map((s) => (
            <TenantMigrationRow
              key={s.tenantId}
              status={s}
              onRun={(id) =>
                setPendingAction({ type: 'run', tenantId: id, tenantName: s.tenantName })
              }
              onRevert={(id) =>
                setPendingAction({ type: 'revert', tenantId: id, tenantName: s.tenantName })
              }
              isRunning={runForTenant.isPending && runForTenant.variables === s.tenantId}
              isReverting={revertForTenant.isPending && revertForTenant.variables === s.tenantId}
            />
          ))
        )}
      </div>

      {/* ══════════ LOG PANEL ══════════ */}
      <LogPanel open={logsOpen} onToggle={() => setLogsOpen((o) => !o)} />

      {/* ══════════ CONFIRM DIALOG ══════════ */}
      {pendingAction && confirmConfig && (
        <ConfirmDialog
          open
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.label}
          confirmVariant={confirmConfig.variant}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
          loading={isAnyMutating}
        />
      )}
    </div>
  );
}
