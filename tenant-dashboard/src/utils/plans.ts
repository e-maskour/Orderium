import { formatAmount } from './formatAmount';
import { formatQuantity } from './numberFormat';
import type {
  AddonCatalogue,
  AddonResourceKey,
  PlanFeatureKey,
  PlanFeatures,
  PlanLimitKey,
  PlanLimits,
  SubscriptionPlan,
  SubscriptionPlanData,
  SubscriptionPricingLine,
  TenantAddons,
} from '../types/tenant';

/**
 * Presentational plan metadata only. Prices, limits and features always come
 * from `GET /admin/plans` (see `usePlans()`); never hardcode them here.
 */

/** `-1` in any limit field means unlimited. */
export const UNLIMITED = -1;

export const UNLIMITED_LABEL = 'Illimité';

export const PLAN_KEYS: SubscriptionPlan[] = ['trial', 'starter', 'business', 'pro', 'enterprise'];

/** The plan pre-selected when creating a tenant. */
export const DEFAULT_PLAN: SubscriptionPlan = 'trial';
export const DEFAULT_TRIAL_DAYS = 14;

/** Highlighted as the recommended plan. */
export const RECOMMENDED_PLAN: SubscriptionPlan = 'business';

export interface PlanStyle {
  /** Small pill badge (tables, headers). */
  badge: string;
  /** Hero card gradient (`bg-gradient-to-br` stops). */
  gradient: string;
  /** Solid header strip on plan cards. */
  header: string;
  /** Selected card / button state. */
  selected: string;
  /** Distribution bar fill + legend dot. */
  bar: string;
}

export const PLAN_STYLES: Record<SubscriptionPlan, PlanStyle> = {
  trial: {
    badge: 'bg-sky-50 text-sky-700 ring-sky-600/10 dark:bg-sky-900/30 dark:text-sky-400',
    gradient: 'from-sky-400 to-sky-600',
    header: 'bg-sky-500',
    selected: 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/50 dark:bg-sky-900/20',
    bar: 'bg-sky-400',
  },
  starter: {
    badge: 'bg-blue-50 text-blue-700 ring-blue-600/10 dark:bg-blue-900/30 dark:text-blue-400',
    gradient: 'from-blue-400 to-blue-600',
    header: 'bg-blue-600',
    selected: 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/50 dark:bg-blue-900/20',
    bar: 'bg-blue-500',
  },
  business: {
    badge:
      'bg-indigo-50 text-indigo-700 ring-indigo-600/10 dark:bg-indigo-900/30 dark:text-indigo-400',
    gradient: 'from-indigo-400 to-indigo-600',
    header: 'bg-indigo-600',
    selected: 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-900/20',
    bar: 'bg-indigo-500',
  },
  pro: {
    badge:
      'bg-violet-50 text-violet-700 ring-violet-600/10 dark:bg-violet-900/30 dark:text-violet-400',
    gradient: 'from-violet-500 to-purple-600',
    header: 'bg-violet-600',
    selected: 'border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/50 dark:bg-violet-900/20',
    bar: 'bg-violet-600',
  },
  enterprise: {
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/10 dark:bg-rose-900/30 dark:text-rose-400',
    gradient: 'from-rose-500 to-pink-600',
    header: 'bg-rose-600',
    selected: 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-50/50 dark:bg-rose-900/20',
    bar: 'bg-rose-500',
  },
};

/** Style for any plan key, including unknown/legacy values from older records. */
export function planStyle(key: string | null | undefined): PlanStyle {
  return PLAN_STYLES[key as SubscriptionPlan] ?? PLAN_STYLES.trial;
}

/** Display name from the API when loaded; falls back to the capitalised key. */
export function planLabel(
  key: string | null | undefined,
  plans?: SubscriptionPlanData[] | null,
): string {
  if (!key) return '—';
  const plan = plans?.find((p) => p.name === key);
  return plan?.displayName ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Active plans ordered by `sortOrder`. */
export function sortPlans(
  plans: SubscriptionPlanData[] | null | undefined,
): SubscriptionPlanData[] {
  return [...(plans ?? [])].filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isUnlimited(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && value < 0;
}

/** `-1` → `Illimité`, `5000` → `5.000`. */
export function formatLimit(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return isUnlimited(value) ? UNLIMITED_LABEL : formatQuantity(value);
}

/** Storage limit in MB: `-1` → `Illimité`, `10240` → `10 Go`, `512` → `512 Mo`. */
export function formatStorageMb(mb: number | null | undefined): string {
  if (mb === null || mb === undefined) return '—';
  if (isUnlimited(mb)) return UNLIMITED_LABEL;
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${formatAmount(gb, Number.isInteger(gb) ? 0 : 1)} Go`;
  }
  return `${formatQuantity(mb)} Mo`;
}

/** Formats a value of the given limit field. */
export function formatLimitValue(key: PlanLimitKey, value: number | null | undefined): string {
  return key === 'maxStorageMb' ? formatStorageMb(value) : formatLimit(value);
}

/**
 * Usage percentage for a quota, or `null` when there is nothing to measure
 * against (unlimited). A zero limit with any usage reads as 100%+.
 */
export function usagePct(used: number, limit: number): number | null {
  if (isUnlimited(limit)) return null;
  if (limit === 0) return used > 0 ? 100 : 0;
  return Math.round((used / limit) * 100);
}

// ─── Limits & features metadata ──────────────────────────────────────────────

export interface LimitField {
  key: PlanLimitKey;
  label: string;
  unit: string;
  /** Smallest finite value accepted (unlimited is always allowed). */
  min: number;
}

export const LIMIT_FIELDS: LimitField[] = [
  { key: 'maxUsers', label: 'Max Users', unit: 'users', min: 1 },
  { key: 'maxProducts', label: 'Max Products', unit: 'products', min: 1 },
  { key: 'maxWarehouses', label: 'Max Warehouses', unit: 'warehouses', min: 1 },
  { key: 'maxDeliveryPersons', label: 'Max Delivery Persons', unit: 'drivers', min: 0 },
  { key: 'maxOrdersPerMonth', label: 'Max Orders / Month', unit: 'orders/mo', min: 1 },
  { key: 'maxStorageMb', label: 'Max Storage', unit: 'MB', min: 100 },
];

export const LIMIT_KEYS: PlanLimitKey[] = LIMIT_FIELDS.map((f) => f.key);

export const FEATURE_FIELDS: { key: PlanFeatureKey; label: string; description: string }[] = [
  { key: 'pos', label: 'Point of sale', description: 'In-store POS / cash register orders' },
  { key: 'delivery', label: 'Delivery', description: 'Delivery persons and delivery portal' },
  {
    key: 'client_portal',
    label: 'Customer portal',
    description: 'Customers log in, register and order online',
  },
  { key: 'reports', label: 'Advanced reports', description: 'Advanced reports and exports' },
];

export const NO_FEATURES: PlanFeatures = {
  pos: false,
  delivery: false,
  client_portal: false,
  reports: false,
};

/** Normalises a possibly partial/missing features object from the API. */
export function normalizeFeatures(
  features: Partial<PlanFeatures> | null | undefined,
): PlanFeatures {
  return { ...NO_FEATURES, ...(features ?? {}) };
}

export function pickLimits(source: Partial<PlanLimits> | null | undefined): PlanLimits {
  return {
    maxUsers: source?.maxUsers ?? 1,
    maxProducts: source?.maxProducts ?? 1,
    maxWarehouses: source?.maxWarehouses ?? 1,
    maxDeliveryPersons: source?.maxDeliveryPersons ?? 0,
    maxOrdersPerMonth: source?.maxOrdersPerMonth ?? 1,
    maxStorageMb: source?.maxStorageMb ?? 1024,
  };
}

/** Validates edited limits; returns an error message per invalid key. */
export function validateLimits(limits: PlanLimits): Partial<Record<PlanLimitKey, string>> {
  const errors: Partial<Record<PlanLimitKey, string>> = {};
  for (const { key, min } of LIMIT_FIELDS) {
    const v = limits[key];
    if (v === UNLIMITED) continue;
    if (!Number.isInteger(v) || v < min) errors[key] = `Must be at least ${min}, or unlimited`;
  }
  return errors;
}

/** True when the limits/features differ from the plan's defaults. */
export function differsFromPlan(
  plan: SubscriptionPlanData,
  limits: PlanLimits,
  features: PlanFeatures,
): boolean {
  const planFeatures = normalizeFeatures(plan.features);
  return (
    LIMIT_KEYS.some((k) => plan[k] !== limits[k]) ||
    FEATURE_FIELDS.some(({ key }) => planFeatures[key] !== features[key])
  );
}

// ─── Prices & add-ons ────────────────────────────────────────────────────────

/** `1490` → `1.490 DH HT`, `49.5` → `49,50 DH HT`. Plan and add-on prices are HT. */
export function formatPriceHt(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  return `${formatAmount(n, Number.isInteger(n) ? 0 : 2)} DH HT`;
}

/** Add-on yearly price: 10 × monthly, like plans (2 months free). */
export const ADDON_YEARLY_MULTIPLIER = 10;

export interface AddonResourceField {
  key: AddonResourceKey;
  /** The limit a pack of this resource raises. */
  limitKey: PlanLimitKey;
  label: string;
}

export const ADDON_RESOURCE_FIELDS: AddonResourceField[] = [
  { key: 'users', limitKey: 'maxUsers', label: 'Extra users' },
  { key: 'warehouses', limitKey: 'maxWarehouses', label: 'Extra warehouses' },
  { key: 'deliveryPersons', limitKey: 'maxDeliveryPersons', label: 'Delivery persons packs' },
  { key: 'storageMb', limitKey: 'maxStorageMb', label: 'Storage packs' },
];

/** Max packs per resource accepted by the API. */
export const MAX_ADDON_PACKS = 1000;

/** What one pack adds, e.g. `+3 delivery persons`, `+50 Go`. */
export function formatPackSize(key: AddonResourceKey, unit: number): string {
  if (key === 'storageMb') return `+${formatStorageMb(unit)}`;
  const noun = key === 'users' ? 'user' : key === 'warehouses' ? 'warehouse' : 'delivery person';
  return `+${formatQuantity(unit)} ${noun}${unit === 1 ? '' : 's'}`;
}

export interface NormalizedAddons {
  users: number;
  warehouses: number;
  deliveryPersons: number;
  storageMb: number;
  features: PlanFeatures;
}

/** Fills missing pack counts / feature flags so drafts compare reliably. */
export function normalizeAddons(addons: TenantAddons | null | undefined): NormalizedAddons {
  const count = (v: number | undefined) => {
    const n = Math.floor(Number(v ?? 0));
    return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_ADDON_PACKS) : 0;
  };
  return {
    users: count(addons?.users),
    warehouses: count(addons?.warehouses),
    deliveryPersons: count(addons?.deliveryPersons),
    storageMb: count(addons?.storageMb),
    features: normalizeFeatures(addons?.features),
  };
}

export function sameAddons(a: NormalizedAddons, b: NormalizedAddons): boolean {
  return (
    ADDON_RESOURCE_FIELDS.every(({ key }) => a[key] === b[key]) &&
    FEATURE_FIELDS.every(({ key }) => a.features[key] === b.features[key])
  );
}

/** Compact body for `PUT /admin/tenants/:id/subscription` (zero counts / false flags dropped). */
export function toAddonsInput(addons: NormalizedAddons): TenantAddons {
  const out: TenantAddons = {};
  for (const { key } of ADDON_RESOURCE_FIELDS) if (addons[key] > 0) out[key] = addons[key];
  const features = Object.fromEntries(
    FEATURE_FIELDS.filter(({ key }) => addons.features[key]).map(({ key }) => [key, true]),
  );
  if (Object.keys(features).length) out.features = features;
  return out;
}

export interface AddonsComputation {
  limits: PlanLimits;
  features: PlanFeatures;
  /** Limit units each resource add-on contributes (0 when ignored on an unlimited limit). */
  extra: Record<AddonResourceKey, number>;
  lines: SubscriptionPricingLine[];
  addonsMonthly: number;
}

/**
 * Plan + add-ons → effective limits, features and add-on price. Mirrors the
 * API's `computeSubscription` so the UI can preview changes before saving:
 * packs on an unlimited limit are ignored, a feature the plan already
 * includes is never charged.
 */
export function computeAddons(
  planLimits: PlanLimits,
  planFeatures: PlanFeatures,
  addons: NormalizedAddons,
  catalogue: AddonCatalogue,
): AddonsComputation {
  const limits = { ...planLimits };
  const extra = { users: 0, warehouses: 0, deliveryPersons: 0, storageMb: 0 };
  const lines: SubscriptionPricingLine[] = [];
  for (const { key, limitKey } of ADDON_RESOURCE_FIELDS) {
    const qty = addons[key];
    const def = catalogue.resources[key];
    if (!qty || !def || isUnlimited(planLimits[limitKey])) continue;
    extra[key] = qty * def.unit;
    limits[limitKey] = planLimits[limitKey] + extra[key];
    lines.push({ key, label: def.label, quantity: qty, priceMonthly: qty * def.priceMonthly });
  }
  const features = { ...planFeatures };
  for (const { key } of FEATURE_FIELDS) {
    if (!addons.features[key] || planFeatures[key]) continue;
    features[key] = true;
    const def = catalogue.features[key];
    lines.push({
      key: `feature:${key}`,
      label: def?.label ?? key,
      quantity: 1,
      priceMonthly: def?.priceMonthly ?? 0,
    });
  }
  return {
    limits,
    features,
    extra,
    lines,
    addonsMonthly: lines.reduce((sum, l) => sum + l.priceMonthly, 0),
  };
}

/** English label for a pricing line key (`users`, `feature:pos`, …). */
export function pricingLineLabel(line: SubscriptionPricingLine): string {
  if (line.key.startsWith('feature:')) {
    const key = line.key.slice('feature:'.length);
    return FEATURE_FIELDS.find((f) => f.key === key)?.label ?? line.label;
  }
  const field = ADDON_RESOURCE_FIELDS.find((f) => f.key === line.key);
  return field ? `${field.label} × ${formatQuantity(line.quantity)}` : line.label;
}
