import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { PaymentProgress } from './PaymentStatusBadge';
import { useAddInstallment } from '../hooks/usePayments';
import { formatMoney, todayIso } from '../utils/format';
import {
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
  type Payment,
  type PaymentType,
} from '../types/payment';

interface Props {
  open: boolean;
  payment: Payment;
  onClose: () => void;
}

/**
 * Records one tranche against an obligation.
 *
 * The overpay guard here is a convenience, not the control — the server
 * re-checks it under a row lock. Client-side it exists so the user sees the
 * problem while typing instead of after submitting.
 */
export function RecordInstallmentDialog({ open, payment, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [paymentType, setPaymentType] = useState<PaymentType>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [validateImmediately, setValidateImmediately] = useState(true);

  const addInstallment = useAddInstallment();

  useEffect(() => {
    if (!open) return;
    setAmount(payment.amountRemaining > 0 ? String(payment.amountRemaining) : '');
    setPaymentDate(todayIso());
    setPaymentType('bank_transfer');
    setReferenceNumber('');
    setNotes('');
    setValidateImmediately(true);
  }, [open, payment.amountRemaining]);

  const parsed = Number(amount);
  const isNumeric = amount.trim() !== '' && Number.isFinite(parsed);
  const remainingAfter = isNumeric
    ? Math.round((payment.amountRemaining - parsed) * 100) / 100
    : payment.amountRemaining;

  const error = !isNumeric
    ? null
    : parsed <= 0
      ? 'Amount must be greater than zero.'
      : parsed > payment.amountRemaining
        ? `Exceeds the remaining balance of ${formatMoney(payment.amountRemaining, payment.currency)}.`
        : paymentDate < payment.periodStart
          ? 'Payment date cannot precede the billing period start.'
          : null;

  const canSubmit = isNumeric && !error && !addInstallment.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    addInstallment
      .mutateAsync({
        paymentId: payment.id,
        input: {
          amount: parsed,
          paymentDate,
          paymentType,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          validateImmediately,
        },
      })
      .then(() => {
        toast.success(
          `Recorded ${formatMoney(parsed, payment.currency)}${
            remainingAfter <= 0 ? ' — payment settled in full' : ''
          }`,
        );
        onClose();
      })
      .catch((err: { response?: { data?: { message?: string } } }) =>
        toast.error(err.response?.data?.message ?? 'Could not record payment'),
      );
  };

  const projectedPaid = isNumeric && !error ? payment.amountPaid + parsed : payment.amountPaid;

  return (
    <Modal
      open={open}
      title="Record a payment"
      description={`${payment.tenant?.name ?? `Tenant #${payment.tenantId}`} — ${payment.planName} ${payment.billingCycle}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="record-installment-form"
            className="btn-primary"
            disabled={!canSubmit}
          >
            {addInstallment.isPending ? 'Recording…' : 'Record payment'}
          </button>
        </>
      }
    >
      <form id="record-installment-form" onSubmit={submit} className="space-y-5">
        {/* Live balance */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/60 dark:bg-slate-800/50">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Total due</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatMoney(payment.amountDue, payment.currency)}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Already paid</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {formatMoney(payment.amountPaid, payment.currency)}
            </span>
          </div>
          <div className="mt-3">
            <PaymentProgress
              paid={projectedPaid}
              due={payment.amountDue}
              label={`${formatMoney(projectedPaid, payment.currency)} of ${formatMoney(payment.amountDue, payment.currency)} paid`}
            />
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3 text-sm dark:border-slate-700/60">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Remaining after this payment
            </span>
            <span
              className={`text-base font-bold ${
                error
                  ? 'text-red-600 dark:text-red-400'
                  : remainingAfter <= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {formatMoney(Math.max(remainingAfter, 0), payment.currency)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="inst-amount" className="label">
              Amount ({payment.currency})
            </label>
            <input
              id="inst-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={payment.amountRemaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              required
              aria-invalid={!!error}
              aria-describedby={error ? 'inst-amount-error' : undefined}
            />
          </div>
          <div>
            <label htmlFor="inst-date" className="label">
              Payment date
            </label>
            <input
              id="inst-date"
              type="date"
              value={paymentDate}
              min={payment.periodStart}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        {error && (
          <p
            id="inst-amount-error"
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div>
          <label htmlFor="inst-type" className="label">
            Payment type
          </label>
          <select
            id="inst-type"
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as PaymentType)}
            className="input"
          >
            {PAYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PAYMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="inst-ref" className="label">
            Reference number <span className="font-normal normal-case">(optional)</span>
          </label>
          <input
            id="inst-ref"
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="input"
            placeholder="Transfer ref, cheque no.…"
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="inst-notes" className="label">
            Note <span className="font-normal normal-case">(optional)</span>
          </label>
          <textarea
            id="inst-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[72px] resize-y"
            maxLength={2000}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700/60">
          <input
            type="checkbox"
            checked={validateImmediately}
            onChange={(e) => setValidateImmediately(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
          />
          <span className="text-sm">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Mark as validated
            </span>
            <span className="mt-0.5 block text-slate-500 dark:text-slate-400">
              Only validated payments count toward the balance. Untick to log it as awaiting
              confirmation.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}
