import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { useTenants, usePlans } from '../hooks/useTenants';
import { useCreatePayment, useUpdatePayment } from '../hooks/usePayments';
import { formatMoney, todayIso, addMonths } from '../utils/format';
import { BILLING_CYCLE_LABELS, type BillingCycle, type Payment } from '../types/payment';
import type { SubscriptionPlan } from '../types/tenant';

const PLANS: SubscriptionPlan[] = ['trial', 'basic', 'pro', 'enterprise'];
const CYCLES: BillingCycle[] = ['monthly', 'yearly'];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Present => edit mode. */
  payment?: Payment;
  /** Locks the tenant selector, e.g. when opened from a tenant's page. */
  fixedTenantId?: number;
}

export function PaymentForm({ open, onClose, payment, fixedTenantId }: Props) {
  const isEdit = !!payment;

  const [tenantId, setTenantId] = useState<number | ''>(fixedTenantId ?? '');
  const [planName, setPlanName] = useState<SubscriptionPlan>('basic');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [periodStart, setPeriodStart] = useState(todayIso());
  const [periodEnd, setPeriodEnd] = useState(addMonths(todayIso(), 12));
  const [dueDate, setDueDate] = useState(todayIso());
  const [amountDue, setAmountDue] = useState('');
  const [notes, setNotes] = useState('');
  /** Once the user edits the amount, plan changes stop overwriting it. */
  const [amountTouched, setAmountTouched] = useState(false);

  const { data: tenantsData } = useTenants({ limit: 200, status: 'all' });
  const { data: plans } = usePlans();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();

  const plan = plans?.find((p) => p.name === planName);
  const currency = payment?.currency ?? plan?.currency ?? 'MAD';

  useEffect(() => {
    if (!open) return;
    if (payment) {
      setTenantId(payment.tenantId);
      setPlanName(payment.planName);
      setBillingCycle(payment.billingCycle);
      setPeriodStart(payment.periodStart.slice(0, 10));
      setPeriodEnd(payment.periodEnd.slice(0, 10));
      setDueDate(payment.dueDate.slice(0, 10));
      setAmountDue(String(payment.amountDue));
      setNotes(payment.notes ?? '');
      setAmountTouched(true);
    } else {
      const today = todayIso();
      setTenantId(fixedTenantId ?? '');
      setPlanName('basic');
      setBillingCycle('yearly');
      setPeriodStart(today);
      setPeriodEnd(addMonths(today, 12));
      setDueDate(today);
      setAmountDue('');
      setNotes('');
      setAmountTouched(false);
    }
  }, [open, payment, fixedTenantId]);

  // Period end follows the cycle unless the user has overridden it by hand.
  const applyCycle = (cycle: BillingCycle, start: string) => {
    setBillingCycle(cycle);
    setPeriodEnd(addMonths(start, cycle === 'yearly' ? 12 : 1));
  };

  // Prefill from the plan's list price — the operator can still override it.
  useEffect(() => {
    if (amountTouched || !plan) return;
    const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    if (price > 0) setAmountDue(String(price));
  }, [plan, billingCycle, amountTouched]);

  const parsedAmount = Number(amountDue);
  const amountValid = amountDue.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const paid = payment?.amountPaid ?? 0;
  const belowPaid = isEdit && amountValid && parsedAmount < paid;
  const periodInvalid = periodEnd < periodStart;

  const error = !amountValid
    ? null
    : belowPaid
      ? `Total cannot drop below the ${formatMoney(paid, currency)} already collected.`
      : periodInvalid
        ? 'Period end cannot precede period start.'
        : null;

  const canSubmit =
    amountValid &&
    !error &&
    (isEdit || tenantId !== '') &&
    !createPayment.isPending &&
    !updatePayment.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const body = {
      amountDue: parsedAmount,
      planName,
      billingCycle,
      periodStart,
      periodEnd,
      dueDate,
      notes: notes.trim() || undefined,
    };

    const action = isEdit
      ? updatePayment.mutateAsync({ id: payment.id, input: body })
      : createPayment.mutateAsync({
          tenantId: tenantId as number,
          input: body,
        });

    action
      .then(() => {
        toast.success(isEdit ? 'Payment updated' : 'Payment created');
        onClose();
      })
      .catch((err: { response?: { data?: { message?: string } } }) =>
        toast.error(err.response?.data?.message ?? 'Could not save payment'),
      );
  };

  return (
    <Modal
      open={open}
      size="lg"
      title={isEdit ? 'Edit payment' : 'New payment'}
      description={
        isEdit
          ? 'Changes apply to the obligation, not to the tranches already recorded against it.'
          : 'Record what a tenant owes for a billing period. Tranches are added afterwards.'
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="payment-form" className="btn-primary" disabled={!canSubmit}>
            {createPayment.isPending || updatePayment.isPending
              ? 'Saving…'
              : isEdit
                ? 'Save changes'
                : 'Create payment'}
          </button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="pf-tenant" className="label">
            Client (tenant)
          </label>
          <select
            id="pf-tenant"
            value={tenantId}
            onChange={(e) => setTenantId(Number(e.target.value))}
            className="input"
            disabled={isEdit || fixedTenantId !== undefined}
            required
          >
            <option value="" disabled>
              Select a client…
            </option>
            {tenantsData?.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
          {isEdit && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              The client cannot be changed once a payment exists — delete it and create a new one
              instead.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="pf-plan" className="label">
              Plan
            </label>
            <select
              id="pf-plan"
              value={planName}
              onChange={(e) => setPlanName(e.target.value as SubscriptionPlan)}
              className="input"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pf-cycle" className="label">
              Billing cycle
            </label>
            <select
              id="pf-cycle"
              value={billingCycle}
              onChange={(e) => applyCycle(e.target.value as BillingCycle, periodStart)}
              className="input"
            >
              {CYCLES.map((c) => (
                <option key={c} value={c}>
                  {BILLING_CYCLE_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="pf-start" className="label">
              Period start
            </label>
            <input
              id="pf-start"
              type="date"
              value={periodStart}
              onChange={(e) => {
                setPeriodStart(e.target.value);
                setPeriodEnd(addMonths(e.target.value, billingCycle === 'yearly' ? 12 : 1));
              }}
              className="input"
              required
            />
          </div>
          <div>
            <label htmlFor="pf-end" className="label">
              Period end
            </label>
            <input
              id="pf-end"
              type="date"
              value={periodEnd}
              min={periodStart}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="input"
              required
              aria-invalid={periodInvalid}
            />
          </div>
          <div>
            <label htmlFor="pf-due" className="label">
              Due date
            </label>
            <input
              id="pf-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="pf-amount" className="label">
            Total amount ({currency})
          </label>
          <input
            id="pf-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amountDue}
            onChange={(e) => {
              setAmountDue(e.target.value);
              setAmountTouched(true);
            }}
            className="input"
            required
            aria-invalid={!!error}
            aria-describedby={error ? 'pf-amount-error' : 'pf-amount-hint'}
          />
          {!error && plan && !amountTouched && (
            <p id="pf-amount-hint" className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Prefilled from the {plan.displayName} {billingCycle} list price — edit it for a
              negotiated amount.
            </p>
          )}
          {error && (
            <p
              id="pf-amount-error"
              role="alert"
              className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="pf-notes" className="label">
            Notes <span className="font-normal normal-case">(optional)</span>
          </label>
          <textarea
            id="pf-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[72px] resize-y"
            maxLength={2000}
          />
        </div>
      </form>
    </Modal>
  );
}
