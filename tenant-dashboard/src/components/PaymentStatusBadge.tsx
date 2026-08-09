import type { PaymentStatus, InstallmentStatus } from '../types/payment';
import { PAYMENT_STATUS_LABELS, INSTALLMENT_STATUS_LABELS } from '../types/payment';

const PAYMENT_STYLES: Record<PaymentStatus, { chip: string; dot: string }> = {
  pending: {
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  partial: {
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  paid: {
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  overdue: {
    chip: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    dot: 'bg-red-500',
  },
  void: {
    chip: 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-500',
    dot: 'bg-slate-300 dark:bg-slate-600',
  },
};

const INSTALLMENT_STYLES: Record<InstallmentStatus, string> = {
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
  validated: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  refunded: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
};

interface Props {
  status: PaymentStatus;
  /**
   * A part-paid invoice can also be late. `status` alone would show only
   * "Overdue" and hide the fact that money has come in, so the partial state
   * is appended rather than replaced.
   */
  isOverdue?: boolean;
}

export function PaymentStatusBadge({ status, isOverdue = false }: Props) {
  const style = PAYMENT_STYLES[status] ?? PAYMENT_STYLES.pending;
  const showBoth = isOverdue && status === 'overdue';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.chip}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
      {PAYMENT_STATUS_LABELS[status] ?? status}
      {showBoth && <span className="sr-only"> — payment is past its due date</span>}
    </span>
  );
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        INSTALLMENT_STYLES[status] ?? INSTALLMENT_STYLES.pending
      }`}
    >
      {INSTALLMENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/**
 * Paid-vs-due progress. `aria-valuetext` carries the real figures because the
 * percentage alone doesn't tell a screen-reader user how much is outstanding.
 */
export function PaymentProgress({
  paid,
  due,
  label,
}: {
  paid: number;
  due: number;
  label: string;
}) {
  const pct = due > 0 ? Math.min(100, Math.round((paid / due) * 100)) : 0;
  const complete = pct >= 100;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={label}
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          complete ? 'bg-emerald-500' : 'bg-indigo-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
