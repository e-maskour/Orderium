import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle,
  Gauge,
  HardDrive,
  Info,
  Minus,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  ShoppingCart,
  Sliders,
  Truck,
  Users,
  Warehouse,
  XCircle,
  Zap,
} from 'lucide-react';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';
import { FeaturesList, LimitsList } from './PlanLimitsEditor';
import {
  useAddonCatalogue,
  useTenantSubscription,
  useUpdateTenantSubscription,
} from '../hooks/useTenants';
import { apiErrorMessage } from '../api/client';
import {
  ADDON_RESOURCE_FIELDS,
  ADDON_YEARLY_MULTIPLIER,
  FEATURE_FIELDS,
  LIMIT_FIELDS,
  LIMIT_KEYS,
  MAX_ADDON_PACKS,
  UNLIMITED_LABEL,
  computeAddons,
  formatLimitValue,
  formatPackSize,
  formatPriceHt,
  isUnlimited,
  normalizeAddons,
  normalizeFeatures,
  pickLimits,
  planStyle,
  pricingLineLabel,
  sameAddons,
  sortPlans,
  toAddonsInput,
  type NormalizedAddons,
} from '../utils/plans';
import { formatDate } from '../utils/format';
import { formatQuantity } from '../utils/numberFormat';
import type {
  AddonCatalogue,
  PlanFeatures,
  PlanLimitKey,
  PlanLimits,
  SubscriptionPlanData,
  TenantSubscriptionDetail,
  UsageResourceKey,
} from '../types/tenant';

// ─── Metadata ────────────────────────────────────────────────────────────────

const USAGE_FIELDS: {
  key: UsageResourceKey;
  limitKey: PlanLimitKey;
  label: string;
  icon: ReactNode;
}[] = [
  { key: 'users', limitKey: 'maxUsers', label: 'Users (staff)', icon: <Users /> },
  { key: 'products', limitKey: 'maxProducts', label: 'Products', icon: <Package /> },
  { key: 'warehouses', limitKey: 'maxWarehouses', label: 'Warehouses', icon: <Warehouse /> },
  {
    key: 'deliveryPersons',
    limitKey: 'maxDeliveryPersons',
    label: 'Delivery persons',
    icon: <Truck />,
  },
  {
    key: 'ordersPerMonth',
    limitKey: 'maxOrdersPerMonth',
    label: 'Orders this month',
    icon: <ShoppingCart />,
  },
  { key: 'storageMb', limitKey: 'maxStorageMb', label: 'Storage', icon: <HardDrive /> },
];

/** Formats a used quantity of a limit (storage is in MB, possibly fractional). */
function formatUsed(limitKey: PlanLimitKey, used: number): string {
  if (limitKey !== 'maxStorageMb') return formatQuantity(Math.max(0, used));
  if (used > 0 && used < 1) return '< 1 Mo';
  return formatLimitValue(limitKey, Math.round(Math.max(0, used)));
}

/** Plan limits as reported by the subscription endpoint, or `null` for an unknown plan. */
function planLimitsOf(plan: TenantSubscriptionDetail['plan']): PlanLimits | null {
  if (LIMIT_KEYS.some((k) => typeof plan[k] !== 'number')) return null;
  return pickLimits(plan);
}

// ─── Small building blocks ───────────────────────────────────────────────────

function CardTitle({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <span className="text-indigo-500 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          {title}
        </h3>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function UsageMeter({
  label,
  icon,
  limitKey,
  used,
  max,
}: {
  label: string;
  icon: ReactNode;
  limitKey: PlanLimitKey;
  used: number;
  max: number;
}) {
  const unlimited = isUnlimited(max);
  const notIncluded = max === 0;
  const pct = unlimited || notIncluded ? null : Math.round((used / max) * 100);
  const over = !unlimited && used > max;
  const tone =
    over || (pct !== null && pct >= 100) ? 'red' : pct !== null && pct >= 80 ? 'amber' : 'indigo';
  const bar = { red: 'bg-red-500', amber: 'bg-amber-500', indigo: 'bg-indigo-500' }[tone];
  const track = {
    red: 'bg-red-50 dark:bg-red-950/30',
    amber: 'bg-amber-50 dark:bg-amber-950/30',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/30',
  }[tone];
  const text = {
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    indigo: 'text-slate-500 dark:text-slate-400',
  }[tone];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${text}`}>{icon}</span>
          <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
          {pct !== null && <span className={`font-semibold ${text}`}>{pct}%</span>}
          <span className="text-slate-500 dark:text-slate-400">
            {formatUsed(limitKey, used)} /{' '}
            {unlimited
              ? UNLIMITED_LABEL
              : notIncluded
                ? 'Not included'
                : formatLimitValue(limitKey, max)}
          </span>
        </div>
      </div>
      {pct !== null && (
        <div className={`h-2 w-full overflow-hidden rounded-full ${track}`}>
          <div
            className={`h-2 rounded-full transition-all duration-700 ease-out ${bar}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      )}
      {over && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {notIncluded ? 'Not included, but ' : ''}
          Over limit by {formatUsed(limitKey, used - max)}
        </p>
      )}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  canIncrement,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  canIncrement: boolean;
  label: string;
}) {
  const btn =
    'flex h-8 w-8 items-center justify-center text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800';
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        aria-label={`Remove one ${label}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={!canIncrement || value >= MAX_ADDON_PACKS}
        aria-label={`Add one ${label}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

// ─── Change plan dialog ──────────────────────────────────────────────────────

function ChangePlanDialog({
  open,
  onClose,
  sub,
  plans,
  catalogue,
  onConfirm,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  sub: TenantSubscriptionDetail;
  plans: SubscriptionPlanData[] | undefined;
  catalogue: AddonCatalogue;
  onConfirm: (planName: SubscriptionPlanData['name']) => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<SubscriptionPlanData['name'] | null>(null);
  const options = sortPlans(plans);
  const target = options.find((p) => p.name === selected && p.name !== sub.plan.name) ?? null;

  // Cheap to compute: no memoization needed.
  const preview = (() => {
    if (!target) return null;
    const addons = normalizeAddons(sub.addons);
    const computed = computeAddons(
      pickLimits(target),
      normalizeFeatures(target.features),
      addons,
      catalogue,
    );
    const overLimits = sub.usage
      ? USAGE_FIELDS.flatMap(({ key, limitKey, label }) => {
          const used = sub.usage?.[key]?.used ?? 0;
          const max = computed.limits[limitKey];
          return !isUnlimited(max) && used > max ? [{ label, limitKey, used, max }] : [];
        })
      : [];
    const lostFeatures = FEATURE_FIELDS.filter(
      ({ key }) => sub.features[key] && !computed.features[key],
    );
    const nowIncluded = FEATURE_FIELDS.filter(
      ({ key }) => addons.features[key] && normalizeFeatures(target.features)[key],
    );
    return {
      computed,
      overLimits,
      lostFeatures,
      nowIncluded,
      totalMonthly: target.priceMonthly + computed.addonsMonthly,
      totalYearly: target.priceYearly + computed.addonsMonthly * ADDON_YEARLY_MULTIPLIER,
    };
  })();

  const close = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      busy={saving}
      size="lg"
      title="Change plan"
      icon={<ArrowRightLeft />}
      description="Limits are recomputed from the new plan plus the current add-ons. Billing is separate: record the payment from the Payments tab."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={close} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!target || saving}
            onClick={() => target && onConfirm(target.name)}
          >
            {saving ? 'Saving…' : target ? `Switch to ${target.displayName}` : 'Select a plan'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {options.length === 0 ? (
          <p className="text-sm text-slate-400">Loading plans…</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options.map((p) => {
              const isCurrent = p.name === sub.plan.name;
              const isSelected = p.name === selected && !isCurrent;
              const style = planStyle(p.name);
              const free = p.priceMonthly <= 0 && p.priceYearly <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isCurrent || saving}
                  onClick={() => setSelected(p.name)}
                  aria-pressed={isSelected}
                  className={[
                    'overflow-hidden rounded-xl border-2 text-left transition-all duration-150',
                    isSelected
                      ? style.selected
                      : isCurrent
                        ? 'cursor-default border-slate-200 opacity-80 dark:border-slate-700'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
                  ].join(' ')}
                >
                  <div
                    className={`flex items-center justify-between px-4 py-2 text-white ${style.header}`}
                  >
                    <span className="text-sm font-bold">{p.displayName}</span>
                    {isCurrent && (
                      <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-semibold">
                        Current plan
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      {free ? (
                        <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Free
                        </p>
                      ) : (
                        <>
                          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {formatPriceHt(p.priceMonthly)}
                            <span className="text-xs font-normal text-slate-400"> / month</span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatPriceHt(p.priceYearly)} / year
                          </p>
                        </>
                      )}
                    </div>
                    <LimitsList limits={pickLimits(p)} />
                    <FeaturesList features={normalizeFeatures(p.features)} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {target && preview && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              New total with current add-ons: {formatPriceHt(preview.totalMonthly)} / month ·{' '}
              {formatPriceHt(preview.totalYearly)} / year
            </p>
            {preview.overLimits.length === 0 && preview.lostFeatures.length === 0 && (
              <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Current usage fits within the {target.displayName} limits.
              </p>
            )}
            {preview.overLimits.length > 0 && (
              <div className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <p className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Current usage exceeds the new limits
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-6 text-xs">
                  {preview.overLimits.map((o) => (
                    <li key={o.limitKey}>
                      {o.label}: {formatUsed(o.limitKey, o.used)} in use, new limit{' '}
                      {o.max === 0 ? 'not included' : formatLimitValue(o.limitKey, o.max)}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs">
                  Existing data is kept, but the tenant cannot create more until usage is reduced or
                  add-ons are bought.
                </p>
              </div>
            )}
            {preview.lostFeatures.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                <p className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Features that would be lost
                </p>
                <p className="mt-1 text-xs">
                  {preview.lostFeatures.map((f) => f.label).join(', ')} — buy them as add-ons
                  afterwards to keep them.
                </p>
              </div>
            )}
            {preview.nowIncluded.length > 0 && (
              <p className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {preview.nowIncluded.map((f) => f.label).join(', ')}{' '}
                {preview.nowIncluded.length > 1 ? 'are' : 'is'} included in {target.displayName}:
                the add-on stops being charged.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

interface Props {
  tenantId: number;
  plans: SubscriptionPlanData[] | undefined;
  /** Extra cards shown under the plan header (e.g. the trial card). */
  children?: ReactNode;
}

/** Subscription tab: plan, limits, features, live usage, add-ons and pricing. */
export function TenantSubscriptionPanel({ tenantId, plans, children }: Props) {
  const { data: sub, isLoading, error, refetch } = useTenantSubscription(tenantId);
  const { data: catalogueData } = useAddonCatalogue();
  const update = useUpdateTenantSubscription(tenantId);

  /** `null` = untouched, i.e. the saved add-ons. */
  const [draft, setDraft] = useState<NormalizedAddons | null>(null);
  const [changePlanOpen, setChangePlanOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="card flex h-48 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !sub) {
    return (
      <div className="card flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangle className="h-7 w-7 text-red-400" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {apiErrorMessage(error, 'Could not load the subscription.')}
        </p>
        <button type="button" className="btn-secondary text-xs" onClick={() => refetch()}>
          <RotateCcw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  const catalogue = catalogueData ?? sub.catalogue;
  const style = planStyle(sub.plan.name);
  const planLimits = planLimitsOf(sub.plan);
  const planFeatures = normalizeFeatures(sub.plan.features);
  const planMonthly = sub.pricing?.planMonthly ?? sub.plan.priceMonthly ?? 0;
  const planYearly = sub.pricing?.planYearly ?? sub.plan.priceYearly ?? 0;

  const saved = normalizeAddons(sub.addons);
  const current = draft ?? saved;
  const dirty = draft !== null && !sameAddons(draft, saved);
  const savedCalc = planLimits ? computeAddons(planLimits, planFeatures, saved, catalogue) : null;
  const draftCalc = planLimits ? computeAddons(planLimits, planFeatures, current, catalogue) : null;
  const draftMonthly = planMonthly + (draftCalc?.addonsMonthly ?? 0);
  const draftYearly = planYearly + (draftCalc?.addonsMonthly ?? 0) * ADDON_YEARLY_MULTIPLIER;

  const setPacks = (key: (typeof ADDON_RESOURCE_FIELDS)[number]['key'], value: number) =>
    setDraft({ ...current, [key]: Math.max(0, Math.min(MAX_ADDON_PACKS, value)) });
  const setFeature = (key: keyof PlanFeatures, value: boolean) =>
    setDraft({ ...current, features: { ...current.features, [key]: value } });

  const save = async (addons: NormalizedAddons, successMessage: string) => {
    try {
      await update.mutateAsync({ addons: toAddonsInput(addons) });
      setDraft(null);
      toast.success(successMessage);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update the subscription'));
    }
  };

  const changePlan = async (planName: SubscriptionPlanData['name']) => {
    try {
      const result = await update.mutateAsync({ planName });
      setChangePlanOpen(false);
      setDraft(null);
      toast.success(`Plan changed to ${result.plan.displayName}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not change the plan'));
    }
  };

  const extraFeatures = FEATURE_FIELDS.filter(({ key }) => !planFeatures[key]);
  const deliveryAvailable = planFeatures.delivery || current.features.delivery;

  return (
    <div className="space-y-6">
      {/* ── 1. Plan header ── */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.gradient} p-6 text-white shadow-lg`}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 70% 30%, white 0%, transparent 60%)',
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/70">Current plan</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h3 className="text-3xl font-extrabold tracking-tight">{sub.plan.displayName}</h3>
              <span className="rounded-full bg-white/90 dark:bg-white/90">
                <StatusBadge status={sub.status} />
              </span>
            </div>
            <p className="mt-2 text-sm text-white/80">
              {!sub.subscriptionStartedAt && !sub.subscriptionEndsAt && sub.trialEndsAt
                ? `Trial until ${formatDate(sub.trialEndsAt)}`
                : `${formatDate(sub.subscriptionStartedAt)} → ${formatDate(sub.subscriptionEndsAt)}`}
            </p>
            <span
              className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-white/20 ${sub.autoRenew ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}
            >
              {sub.autoRenew ? '↻ Auto-renew on' : 'Auto-renew off'}
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {sub.pricing ? (
              <div className="sm:text-right">
                <p className="text-2xl font-bold tabular-nums">
                  {formatPriceHt(sub.pricing.totalMonthly)}
                  <span className="text-sm font-medium text-white/70"> / month</span>
                </p>
                <p className="text-sm tabular-nums text-white/80">
                  {formatPriceHt(sub.pricing.totalYearly)} / year
                </p>
                {sub.pricing.addonsMonthly > 0 && (
                  <p className="mt-0.5 text-xs text-white/60">Plan + add-ons</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/70">Pricing unavailable for this plan</p>
            )}
            <button
              type="button"
              onClick={() => setChangePlanOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/90 active:scale-95"
            >
              <ArrowRightLeft className="h-4 w-4" /> Change plan
            </button>
          </div>
        </div>
      </div>

      {sub.customized && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Limits were edited manually — saving a plan or add-ons resets them to plan + add-ons.
          </p>
          {planLimits && (
            <button
              type="button"
              className="btn-secondary shrink-0 py-1.5 text-xs"
              disabled={update.isPending}
              onClick={() => save(saved, 'Limits reset to plan + add-ons')}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to plan + add-ons
            </button>
          )}
        </div>
      )}

      {children}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* 2. Limits */}
          <div className="card p-6">
            <CardTitle
              icon={<Sliders />}
              title="Limits"
              subtitle="Enforced by the API right now."
            />
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              {LIMIT_FIELDS.map(({ key, label }) => {
                const effective = sub.limits[key];
                const resource = ADDON_RESOURCE_FIELDS.find((f) => f.limitKey === key);
                const extra = resource && savedCalc ? savedCalc.extra[resource.key] : 0;
                const expected = savedCalc?.limits[key];
                const overridden = expected !== undefined && expected !== effective;
                return (
                  <div key={key} className="flex items-start justify-between gap-3 py-2.5">
                    <dt className="text-sm text-slate-600 dark:text-slate-400">
                      {label.replace(/^Max /, '')}
                    </dt>
                    <dd className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatLimitValue(key, effective)}
                      </p>
                      {planLimits && extra > 0 && (
                        <p className="text-xs text-slate-400">
                          plan {formatLimitValue(key, planLimits[key])} + add-on{' '}
                          {formatLimitValue(key, extra)}
                        </p>
                      )}
                      {overridden && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Manual override (plan + add-ons: {formatLimitValue(key, expected)})
                        </p>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* 3. Features */}
          <div className="card p-6">
            <CardTitle
              icon={<Zap />}
              title="Features"
              subtitle="Modules enabled for this tenant."
            />
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {FEATURE_FIELDS.map(({ key, label, description }) => {
                const inPlan = planFeatures[key];
                const bought = !inPlan && saved.features[key];
                const manual = !inPlan && !bought && sub.features[key];
                const status = inPlan
                  ? {
                      text: 'Included in plan',
                      cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-900/30 dark:text-emerald-400',
                    }
                  : bought
                    ? {
                        text: `Add-on · ${formatPriceHt(catalogue.features[key]?.priceMonthly)} / month`,
                        cls: 'bg-indigo-50 text-indigo-700 ring-indigo-600/10 dark:bg-indigo-900/30 dark:text-indigo-400',
                      }
                    : manual
                      ? {
                          text: 'Enabled manually',
                          cls: 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-900/30 dark:text-amber-400',
                        }
                      : {
                          text: 'Not included',
                          cls: 'bg-slate-100 text-slate-500 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400',
                        };
                const enabled = sub.features[key];
                return (
                  <li key={key} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-start gap-2">
                      {enabled ? (
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {label}
                        </p>
                        <p className="text-xs text-slate-400">{description}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${status.cls}`}
                    >
                      {status.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 4. Usage */}
          <div className="card p-6">
            <CardTitle
              icon={<Gauge />}
              title="Usage"
              subtitle="Live counts vs. enforced limits. Users are staff accounts only; orders are this calendar month."
            />
            {sub.usage ? (
              <div className="space-y-5">
                {USAGE_FIELDS.map(({ key, limitKey, label, icon }) => {
                  const line = sub.usage?.[key];
                  if (!line) return null;
                  return (
                    <UsageMeter
                      key={key}
                      label={label}
                      icon={icon}
                      limitKey={limitKey}
                      used={line.used}
                      max={line.max}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400 dark:bg-slate-800/50">
                Usage is unavailable right now (the tenant database could not be reached).
              </p>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          {/* 5. Add-ons */}
          <div className="card p-6">
            <CardTitle
              icon={<Package />}
              title="Add-ons"
              subtitle="Supplements billed on top of the plan (yearly = 10 × monthly)."
            />
            {!planLimits || !draftCalc ? (
              <p className="text-sm text-slate-400">
                The plan “{sub.plan.displayName}” is unknown — change the plan before adding
                add-ons.
              </p>
            ) : (
              <div className="space-y-5">
                <ul className="space-y-4">
                  {ADDON_RESOURCE_FIELDS.map(({ key, limitKey, label }) => {
                    const def = catalogue.resources[key];
                    if (!def) return null;
                    const unlimitedInPlan = isUnlimited(planLimits[limitKey]);
                    const blocked = key === 'deliveryPersons' && !deliveryAvailable;
                    const hint = unlimitedInPlan
                      ? `Already ${UNLIMITED_LABEL.toLowerCase()} in the plan`
                      : blocked
                        ? 'Requires the Delivery feature (plan or add-on)'
                        : null;
                    const qty = current[key];
                    return (
                      <li key={key} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {label}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatPackSize(key, def.unit)} per pack ·{' '}
                            {formatPriceHt(def.priceMonthly)} / month
                          </p>
                          {hint && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">{hint}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {qty > 0 && !unlimitedInPlan && (
                            <span className="hidden text-xs tabular-nums text-slate-500 sm:inline">
                              {formatPriceHt(qty * def.priceMonthly)}
                            </span>
                          )}
                          <Stepper
                            value={qty}
                            onChange={(v) => setPacks(key, v)}
                            canIncrement={!unlimitedInPlan && !blocked}
                            label={label.toLowerCase()}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Extra features
                  </p>
                  {extraFeatures.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Every feature is already included in the plan.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {extraFeatures.map(({ key, label }) => (
                        <li key={key} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {label}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatPriceHt(catalogue.features[key]?.priceMonthly)} / month
                            </p>
                          </div>
                          <Switch
                            checked={current.features[key]}
                            onChange={(v) => setFeature(key, v)}
                            label={`${label} add-on`}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Add-ons</span>
                    <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
                      {formatPriceHt(draftCalc.addonsMonthly)} / month
                    </span>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-700">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {dirty ? 'New total' : 'Total'} (plan + add-ons)
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatPriceHt(draftMonthly)} / month
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {formatPriceHt(draftYearly)} / year
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {dirty && (
                    <span className="mr-auto text-xs font-medium text-amber-600 dark:text-amber-400">
                      Unsaved changes
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn-secondary py-2 text-xs"
                    disabled={!dirty || update.isPending}
                    onClick={() => setDraft(null)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </button>
                  <button
                    type="button"
                    className="btn-primary py-2 text-xs"
                    disabled={!dirty || update.isPending}
                    onClick={() => save(current, 'Add-ons saved')}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {update.isPending ? 'Saving…' : 'Save add-ons'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. Pricing breakdown */}
          <div className="card p-6">
            <CardTitle
              icon={<Receipt />}
              title="Pricing breakdown"
              subtitle="Saved subscription, excl. VAT (HT)."
            />
            {sub.pricing ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400">
                    <th className="pb-2 text-left font-medium">Item</th>
                    <th className="pb-2 text-right font-medium">Monthly</th>
                    <th className="pb-2 text-right font-medium">Yearly</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
                  <tr>
                    <td className="py-2 text-slate-700 dark:text-slate-300">
                      {sub.plan.displayName} plan
                    </td>
                    <td className="py-2 text-right">{formatPriceHt(sub.pricing.planMonthly)}</td>
                    <td className="py-2 text-right">{formatPriceHt(sub.pricing.planYearly)}</td>
                  </tr>
                  {sub.pricing.lines.map((line) => (
                    <tr key={line.key}>
                      <td className="py-2 text-slate-700 dark:text-slate-300">
                        {pricingLineLabel(line)}
                      </td>
                      <td className="py-2 text-right">{formatPriceHt(line.priceMonthly)}</td>
                      <td className="py-2 text-right">
                        {formatPriceHt(line.priceMonthly * ADDON_YEARLY_MULTIPLIER)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                    <td className="pt-2">Total</td>
                    <td className="pt-2 text-right">{formatPriceHt(sub.pricing.totalMonthly)}</td>
                    <td className="pt-2 text-right">{formatPriceHt(sub.pricing.totalYearly)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p className="text-sm text-slate-400">No pricing available for this plan.</p>
            )}
          </div>
        </div>
      </div>

      <ChangePlanDialog
        open={changePlanOpen}
        onClose={() => setChangePlanOpen(false)}
        sub={sub}
        plans={plans}
        catalogue={catalogue}
        onConfirm={changePlan}
        saving={update.isPending}
      />
    </div>
  );
}
