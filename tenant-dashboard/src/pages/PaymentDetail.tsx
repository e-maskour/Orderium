import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Ban,
  Trash2,
  Mail,
  Phone,
  MapPin,
  User,
  Building2,
  Check,
  X,
  RotateCcw,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import {
  usePayment,
  useVoidPayment,
  useDeletePayment,
  useValidateInstallment,
  useRejectInstallment,
  useRefundInstallment,
  useDeleteInstallment,
} from '../hooks/usePayments';
import { PaymentForm } from '../components/PaymentForm';
import { RecordInstallmentDialog } from '../components/RecordInstallmentDialog';
import {
  PaymentStatusBadge,
  InstallmentStatusBadge,
  PaymentProgress,
} from '../components/PaymentStatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard, SkeletonListItem } from '../components/Skeleton';
import { formatMoney, formatDate, daysUntil } from '../utils/format';
import { BILLING_CYCLE_LABELS, PAYMENT_TYPE_LABELS, type Installment } from '../types/payment';

type PendingAction =
  | { kind: 'void' }
  | { kind: 'delete' }
  | { kind: 'reject'; installment: Installment }
  | { kind: 'refund'; installment: Installment }
  | { kind: 'delete-installment'; installment: Installment }
  | null;

export function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: payment, isLoading, isError, error, refetch } = usePayment(id);

  const voidPayment = useVoidPayment();
  const deletePayment = useDeletePayment();
  const validateInstallment = useValidateInstallment();
  const rejectInstallment = useRejectInstallment();
  const refundInstallment = useRefundInstallment();
  const deleteInstallment = useDeleteInstallment();

  const [recordOpen, setRecordOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [reason, setReason] = useState('');

  const fail = (err: { response?: { data?: { message?: string } } }) =>
    toast.error(err.response?.data?.message ?? 'Action failed');

  if (isError) {
    return (
      <div className="animate-fade-in px-8 py-8">
        <BackLink />
        <div className="card mt-6 px-6 py-16 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
            Could not load this payment
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {(error as Error)?.message ?? 'It may have been deleted.'}
          </p>
          <button onClick={() => refetch()} className="btn-secondary mt-4">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !payment) {
    return (
      <div className="animate-fade-in space-y-6 px-8 py-8">
        <BackLink />
        <SkeletonCard />
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      </div>
    );
  }

  const tenant = payment.tenant;
  const isVoid = payment.status === 'void';
  const settled = payment.amountRemaining <= 0;
  const overdueDays = -daysUntil(payment.dueDate);

  const confirmAction = () => {
    if (!pending) return;

    switch (pending.kind) {
      case 'void':
        voidPayment
          .mutateAsync({ id: payment.id, reason })
          .then(() => toast.success('Payment voided'))
          .catch(fail)
          .finally(() => setPending(null));
        break;
      case 'delete':
        deletePayment
          .mutateAsync({ id: payment.id, tenantId: payment.tenantId })
          .then(() => {
            toast.success('Payment deleted');
            navigate('/payments');
          })
          .catch(fail)
          .finally(() => setPending(null));
        break;
      case 'reject':
        rejectInstallment
          .mutateAsync({ id: pending.installment.id, reason })
          .then(() => toast.success('Tranche rejected'))
          .catch(fail)
          .finally(() => setPending(null));
        break;
      case 'refund':
        refundInstallment
          .mutateAsync({ id: pending.installment.id })
          .then(() => toast.success('Tranche refunded'))
          .catch(fail)
          .finally(() => setPending(null));
        break;
      case 'delete-installment':
        deleteInstallment
          .mutateAsync({ id: pending.installment.id, paymentId: payment.id })
          .then(() => toast.success('Tranche deleted'))
          .catch(fail)
          .finally(() => setPending(null));
        break;
    }
  };

  const dialogCopy: Record<string, { title: string; description: string; label: string }> = {
    void: {
      title: 'Void this payment?',
      description:
        'The obligation is cancelled and stops counting toward outstanding balances. Only possible while nothing has been collected.',
      label: 'Void payment',
    },
    delete: {
      title: 'Delete this payment?',
      description:
        'This permanently removes the payment. Only possible while it has no tranches recorded.',
      label: 'Delete',
    },
    reject: {
      title: 'Reject this tranche?',
      description: 'It stays on the record for audit but never counts toward the balance.',
      label: 'Reject',
    },
    refund: {
      title: 'Refund this tranche?',
      description:
        'The amount stops counting toward the balance and is reported separately as refunded.',
      label: 'Refund',
    },
    'delete-installment': {
      title: 'Delete this tranche?',
      description: 'This permanently removes the record of this payment.',
      label: 'Delete',
    },
  };

  const needsReason = pending?.kind === 'void' || pending?.kind === 'reject';

  return (
    <div className="animate-fade-in space-y-6 px-8 py-8">
      <BackLink />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {tenant?.name ?? `Tenant #${payment.tenantId}`}
            </h1>
            <PaymentStatusBadge status={payment.status} isOverdue={payment.isOverdue} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="capitalize">{payment.planName}</span> ·{' '}
            {BILLING_CYCLE_LABELS[payment.billingCycle]} · {formatDate(payment.periodStart)} –{' '}
            {formatDate(payment.periodEnd)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isVoid && !settled && (
            <button onClick={() => setRecordOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Record a payment
            </button>
          )}
          {!isVoid && (
            <button onClick={() => setEditOpen(true)} className="btn-secondary">
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
          {!isVoid && payment.amountPaid === 0 && (
            <button
              onClick={() => {
                setReason('');
                setPending({ kind: 'void' });
              }}
              className="btn-secondary"
            >
              <Ban className="h-4 w-4" />
              Void
            </button>
          )}
          {payment.installmentCount === 0 && (
            <button
              onClick={() => setPending({ kind: 'delete' })}
              className="btn-secondary text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {isVoid && payment.voidReason && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-400">
          <span className="font-semibold">Voided</span> on {formatDate(payment.voidedAt)} —{' '}
          {payment.voidReason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Balance */}
        <section className="card p-6 lg:col-span-2" aria-labelledby="balance-heading">
          <h2
            id="balance-heading"
            className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
          >
            Balance
          </h2>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <Figure label="Total due" value={formatMoney(payment.amountDue, payment.currency)} />
            <Figure
              label="Paid"
              value={formatMoney(payment.amountPaid, payment.currency)}
              tone="emerald"
            />
            <Figure
              label="Remaining"
              value={formatMoney(payment.amountRemaining, payment.currency)}
              tone={payment.amountRemaining > 0 ? 'amber' : 'slate'}
            />
            {payment.amountRefunded > 0 && (
              <Figure
                label="Refunded"
                value={formatMoney(payment.amountRefunded, payment.currency)}
                tone="violet"
              />
            )}
          </div>

          <div className="mt-5">
            <PaymentProgress
              paid={payment.amountPaid}
              due={payment.amountDue}
              label={`${formatMoney(payment.amountPaid, payment.currency)} of ${formatMoney(payment.amountDue, payment.currency)} paid`}
            />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-5 text-sm dark:border-slate-800 sm:grid-cols-4">
            <Detail label="Due date">
              {formatDate(payment.dueDate)}
              {payment.isOverdue && (
                <span className="ml-1.5 font-semibold text-red-600 dark:text-red-400">
                  ({overdueDays}d overdue)
                </span>
              )}
            </Detail>
            <Detail label="Billing cycle">{BILLING_CYCLE_LABELS[payment.billingCycle]}</Detail>
            <Detail label="Currency">{payment.currency}</Detail>
            <Detail label="Tranches">{payment.installmentCount}</Detail>
          </dl>

          {payment.notes && (
            <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
              {payment.notes}
            </p>
          )}
        </section>

        {/* Client */}
        <section className="card p-6" aria-labelledby="client-heading">
          <h2
            id="client-heading"
            className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
          >
            Client
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <ClientRow icon={<Building2 className="h-4 w-4" />} label="Company">
              {tenant ? (
                <Link
                  to={`/tenants/${tenant.id}`}
                  className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                >
                  {tenant.name}
                </Link>
              ) : (
                `Tenant #${payment.tenantId}`
              )}
            </ClientRow>
            <ClientRow icon={<User className="h-4 w-4" />} label="Contact">
              {tenant?.contactName ?? '—'}
            </ClientRow>
            <ClientRow icon={<Mail className="h-4 w-4" />} label="Email">
              {tenant?.contactEmail ? (
                <a
                  href={`mailto:${tenant.contactEmail}`}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {tenant.contactEmail}
                </a>
              ) : (
                '—'
              )}
            </ClientRow>
            <ClientRow icon={<Phone className="h-4 w-4" />} label="Phone">
              {tenant?.contactPhone ? (
                <a
                  href={`tel:${tenant.contactPhone}`}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {tenant.contactPhone}
                </a>
              ) : (
                '—'
              )}
            </ClientRow>
            <ClientRow icon={<MapPin className="h-4 w-4" />} label="Address">
              {tenant?.address ?? '—'}
            </ClientRow>
          </div>
        </section>
      </div>

      {/* Tranches */}
      <section className="card overflow-hidden" aria-labelledby="tranches-heading">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="tranches-heading"
              className="text-sm font-bold text-slate-900 dark:text-slate-100"
            >
              Recorded payments
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {payment.installments.length} tranche
              {payment.installments.length !== 1 ? 's' : ''} — only validated ones count toward the
              balance
            </p>
          </div>
          {!isVoid && !settled && (
            <button onClick={() => setRecordOpen(true)} className="btn-secondary">
              <Plus className="h-4 w-4" />
              Record
            </button>
          )}
        </div>

        {payment.installments.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Receipt className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
              Nothing recorded yet
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Record a tranche when the client pays — in full or in parts.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {payment.installments.map((inst) => (
              <li
                key={inst.id}
                className="flex flex-wrap items-center gap-4 px-6 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="min-w-[140px]">
                  <p
                    className={`text-base font-bold ${
                      inst.status === 'validated'
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 line-through dark:text-slate-500'
                    }`}
                  >
                    {formatMoney(inst.amount, payment.currency)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(inst.paymentDate)}
                  </p>
                </div>

                <div className="min-w-[130px]">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {PAYMENT_TYPE_LABELS[inst.paymentType]}
                  </p>
                  {inst.referenceNumber && (
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {inst.referenceNumber}
                    </p>
                  )}
                </div>

                <div className="min-w-[150px] flex-1">
                  <InstallmentStatusBadge status={inst.status} />
                  {inst.status === 'validated' && inst.validatedBy && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      by {inst.validatedBy}
                    </p>
                  )}
                  {inst.status === 'rejected' && inst.rejectionReason && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                      {inst.rejectionReason}
                    </p>
                  )}
                  {inst.notes && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{inst.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {inst.status === 'pending' && (
                    <>
                      <IconAction
                        label="Validate tranche"
                        tone="emerald"
                        onClick={() =>
                          validateInstallment
                            .mutateAsync({ id: inst.id })
                            .then(() => toast.success('Tranche validated'))
                            .catch(fail)
                        }
                      >
                        <Check className="h-4 w-4" />
                      </IconAction>
                      <IconAction
                        label="Reject tranche"
                        tone="red"
                        onClick={() => {
                          setReason('');
                          setPending({ kind: 'reject', installment: inst });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </IconAction>
                    </>
                  )}
                  {inst.status === 'validated' && (
                    <IconAction
                      label="Refund tranche"
                      tone="violet"
                      onClick={() => setPending({ kind: 'refund', installment: inst })}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </IconAction>
                  )}
                  <IconAction
                    label="Delete tranche"
                    tone="red"
                    onClick={() => setPending({ kind: 'delete-installment', installment: inst })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconAction>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RecordInstallmentDialog
        open={recordOpen}
        payment={payment}
        onClose={() => setRecordOpen(false)}
      />
      <PaymentForm open={editOpen} payment={payment} onClose={() => setEditOpen(false)} />

      {pending && (
        <>
          {needsReason && (
            <div className="fixed inset-x-0 top-24 z-[60] mx-auto w-full max-w-md px-4">
              <label htmlFor="action-reason" className="sr-only">
                Reason
              </label>
              <input
                id="action-reason"
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (required)…"
                className="input shadow-2xl"
              />
            </div>
          )}
          <ConfirmDialog
            open
            title={dialogCopy[pending.kind].title}
            description={dialogCopy[pending.kind].description}
            confirmLabel={dialogCopy[pending.kind].label}
            confirmVariant={pending.kind === 'refund' ? 'warning' : 'danger'}
            loading={
              voidPayment.isPending ||
              deletePayment.isPending ||
              rejectInstallment.isPending ||
              refundInstallment.isPending ||
              deleteInstallment.isPending
            }
            onConfirm={() => {
              if (needsReason && !reason.trim()) {
                toast.error('A reason is required');
                return;
              }
              confirmAction();
            }}
            onCancel={() => setPending(null)}
          />
        </>
      )}
    </div>
  );
}

// ─── Presentational helpers ──────────────────────────────────────────────────

function BackLink() {
  return (
    <Link
      to="/payments"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
    >
      <ArrowLeft className="h-4 w-4" />
      All payments
    </Link>
  );
}

function Figure({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'emerald' | 'amber' | 'violet';
}) {
  const tones = {
    slate: 'text-slate-900 dark:text-slate-100',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    violet: 'text-violet-600 dark:text-violet-400',
  };
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-700 dark:text-slate-300">{children}</dd>
    </div>
  );
}

function ClientRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-slate-400 dark:text-slate-500" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <div className="mt-0.5 break-words text-slate-700 dark:text-slate-300">{children}</div>
      </div>
    </div>
  );
}

function IconAction({
  label,
  tone,
  onClick,
  children,
}: {
  label: string;
  tone: 'emerald' | 'red' | 'violet';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tones = {
    emerald:
      'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400',
    red: 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400',
    violet:
      'text-slate-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20 dark:hover:text-violet-400',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`icon-btn h-8 w-8 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
