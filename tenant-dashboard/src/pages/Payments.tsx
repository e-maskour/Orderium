import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  SlidersHorizontal,
  X,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CircleDollarSign,
  Receipt,
} from 'lucide-react';
import { usePayments, usePaymentsSummary } from '../hooks/usePayments';
import { useTenants } from '../hooks/useTenants';
import { PaymentForm } from '../components/PaymentForm';
import { PaymentStatusBadge, PaymentProgress } from '../components/PaymentStatusBadge';
import { Pagination } from '../components/Pagination';
import { SearchBar } from '../components/SearchBar';
import { SkeletonListItem } from '../components/Skeleton';
import { formatMoney, formatDate, daysUntil } from '../utils/format';
import {
  BILLING_CYCLE_LABELS,
  PAYMENT_STATUS_LABELS,
  type ListPaymentsParams,
  type PaymentStatus,
} from '../types/payment';

const STATUS_FILTERS: Array<{ value: PaymentStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: PAYMENT_STATUS_LABELS.pending },
  { value: 'partial', label: PAYMENT_STATUS_LABELS.partial },
  { value: 'paid', label: PAYMENT_STATUS_LABELS.paid },
  { value: 'overdue', label: PAYMENT_STATUS_LABELS.overdue },
  { value: 'void', label: PAYMENT_STATUS_LABELS.void },
];

const STATUS_CHIP: Record<string, string> = {
  all: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  void: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
};

export function Payments() {
  const [params, setParams] = useState<ListPaymentsParams>({
    page: 1,
    limit: 20,
    status: 'all',
    billingCycle: 'all',
    planName: 'all',
    search: '',
    sortBy: 'dueDate',
    sortOrder: 'DESC',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = usePayments(params);
  const { data: summary } = usePaymentsSummary({ ...params, page: undefined, limit: undefined });
  const { data: tenantsData } = useTenants({ limit: 200, status: 'all' });

  const set = <K extends keyof ListPaymentsParams>(key: K, value: ListPaymentsParams[K]) =>
    setParams((p) => ({ ...p, [key]: value, page: 1 }));

  const activeFilterCount = [
    params.status !== 'all',
    params.billingCycle !== 'all',
    params.planName !== 'all',
    !!params.tenantId,
    !!params.dueFrom,
    !!params.dueTo,
    !!params.search,
  ].filter(Boolean).length;

  const clearFilters = () =>
    setParams((p) => ({
      ...p,
      status: 'all',
      billingCycle: 'all',
      planName: 'all',
      tenantId: undefined,
      dueFrom: undefined,
      dueTo: undefined,
      search: '',
      page: 1,
    }));

  const rows = data?.data ?? [];

  return (
    <div className="animate-fade-in space-y-6 px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payments</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {data
              ? `${data.total} payment${data.total !== 1 ? 's' : ''} — page ${data.page} of ${data.totalPages || 1}`
              : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            className={`btn-secondary ${activeFilterCount > 0 ? 'border-indigo-300 ring-2 ring-indigo-500/30 dark:border-indigo-600' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button onClick={() => setFormOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Payment
          </button>
        </div>
      </div>

      {/* KPIs — one group per currency, never summed across currencies */}
      {summary?.map((s) => (
        <div key={s.currency} className="space-y-2">
          {summary.length > 1 && (
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {s.currency}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<Receipt className="h-4 w-4" />}
              label="Total billed"
              value={formatMoney(s.totalBilled, s.currency)}
              sub={`${s.invoiceCount} payment${s.invoiceCount !== 1 ? 's' : ''}`}
              tone="slate"
            />
            <KpiCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Collected"
              value={formatMoney(s.totalCollected, s.currency)}
              sub={
                s.totalBilled > 0
                  ? `${Math.round((s.totalCollected / s.totalBilled) * 100)}% of billed`
                  : '—'
              }
              tone="emerald"
            />
            <KpiCard
              icon={<Wallet className="h-4 w-4" />}
              label="Outstanding"
              value={formatMoney(s.totalOutstanding, s.currency)}
              sub="Still to collect"
              tone="amber"
            />
            <KpiCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Overdue"
              value={formatMoney(s.overdueAmount, s.currency)}
              sub={`${s.overdueCount} past due date`}
              tone="red"
            />
          </div>
        </div>
      ))}

      {/* Status quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((o) => (
          <button
            key={o.value}
            onClick={() => set('status', o.value)}
            aria-pressed={params.status === o.value}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              params.status === o.value
                ? `${STATUS_CHIP[o.value]} ring-2 ring-current/30 ring-offset-1`
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="card animate-slide-down space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="f-tenant" className="label">
                Client
              </label>
              <select
                id="f-tenant"
                value={params.tenantId ?? ''}
                onChange={(e) =>
                  set('tenantId', e.target.value ? Number(e.target.value) : undefined)
                }
                className="input"
              >
                <option value="">All clients</option>
                {tenantsData?.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-cycle" className="label">
                Billing cycle
              </label>
              <select
                id="f-cycle"
                value={params.billingCycle}
                onChange={(e) =>
                  set('billingCycle', e.target.value as ListPaymentsParams['billingCycle'])
                }
                className="input"
              >
                <option value="all">All cycles</option>
                <option value="monthly">{BILLING_CYCLE_LABELS.monthly}</option>
                <option value="yearly">{BILLING_CYCLE_LABELS.yearly}</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-due-from" className="label">
                Due from
              </label>
              <input
                id="f-due-from"
                type="date"
                value={params.dueFrom ?? ''}
                onChange={(e) => set('dueFrom', e.target.value || undefined)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="f-due-to" className="label">
                Due to
              </label>
              <input
                id="f-due-to"
                type="date"
                value={params.dueTo ?? ''}
                onChange={(e) => set('dueTo', e.target.value || undefined)}
                className="input"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="w-full max-w-sm">
              <SearchBar
                value={params.search ?? ''}
                onChange={(v) => set('search', v)}
                placeholder="Search client name, slug or contact…"
              />
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isError ? (
          <div className="px-6 py-16 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
              Could not load payments
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {(error as Error)?.message ?? 'Something went wrong.'}
            </p>
            <button onClick={() => refetch()} className="btn-secondary mt-4">
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <CircleDollarSign className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
              {activeFilterCount > 0 ? 'No matching payments' : 'No payments yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {activeFilterCount > 0
                ? 'Try widening or clearing the filters.'
                : 'Create a payment to start tracking what a client owes.'}
            </p>
            {activeFilterCount > 0 ? (
              <button onClick={clearFilters} className="btn-secondary mt-4">
                Clear filters
              </button>
            ) : (
              <button onClick={() => setFormOpen(true)} className="btn-primary mt-4">
                <Plus className="h-4 w-4" />
                New Payment
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Subscription payments by client, showing amount due, amount collected and status
              </caption>
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="px-5 py-3">
                    Client
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Plan / Cycle
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Period
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Due
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Total
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Paid / Remaining
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((p) => {
                  const overdueDays = -daysUntil(p.dueDate);
                  return (
                    <tr
                      key={p.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/payments/${p.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                        >
                          {p.tenant?.name ?? `Tenant #${p.tenantId}`}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {p.tenant?.contactName ?? p.tenant?.slug ?? '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium capitalize text-slate-700 dark:text-slate-300">
                          {p.planName}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {BILLING_CYCLE_LABELS[p.billingCycle]}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        <span className="whitespace-nowrap">{formatDate(p.periodStart)}</span>
                        <p className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
                          to {formatDate(p.periodEnd)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {formatDate(p.dueDate)}
                        </span>
                        {p.isOverdue && (
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                            {overdueDays}d overdue
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(p.amountDue, p.currency)}
                      </td>
                      <td className="px-5 py-3.5" style={{ minWidth: 190 }}>
                        <div className="flex items-baseline justify-between gap-3 text-xs">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(p.amountPaid, p.currency)}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {formatMoney(p.amountRemaining, p.currency)} left
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <PaymentProgress
                            paid={p.amountPaid}
                            due={p.amountDue}
                            label={`${formatMoney(p.amountPaid, p.currency)} of ${formatMoney(p.amountDue, p.currency)} paid`}
                          />
                        </div>
                        {p.installmentCount > 0 && (
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                            {p.installmentCount} tranche
                            {p.installmentCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <PaymentStatusBadge status={p.status} isOverdue={p.isOverdue} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          limit={data.limit}
          onPageChange={(page) => setParams((p) => ({ ...p, page }))}
        />
      )}

      <PaymentForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: 'slate' | 'emerald' | 'amber' | 'red';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  };

  return (
    <div className="stat-card">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <p className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}
