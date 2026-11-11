/**
 * Subscription plan vocabulary shared by the tenant and lifecycle modules.
 *
 * `-1` means unlimited in every limit field.
 */
export const UNLIMITED = -1;

export const PLAN_FEATURES = [
  'pos',
  'delivery',
  'client_portal',
  'reports',
] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];
export type PlanFeatures = Partial<Record<PlanFeature, boolean>>;

export const PLAN_KEYS = [
  'trial',
  'starter',
  'business',
  'pro',
  'enterprise',
] as const;

export type PlanResource =
  | 'users'
  | 'products'
  | 'warehouses'
  | 'deliveryPersons'
  | 'ordersPerMonth'
  | 'storageMb';

/** French, user-facing labels used in enforcement errors. */
export const FEATURE_LABELS: Record<PlanFeature, string> = {
  pos: 'la caisse (point de vente)',
  delivery: 'la gestion des livreurs',
  client_portal: 'le portail client',
  reports: 'les rapports avancés',
};

export const RESOURCE_LABELS: Record<PlanResource, string> = {
  users: 'utilisateurs',
  products: 'produits',
  warehouses: 'dépôts',
  deliveryPersons: 'livreurs',
  ordersPerMonth: 'commandes ce mois-ci',
  storageMb: 'Mo de stockage',
};

export const isUnlimited = (limit: number | null | undefined): boolean =>
  limit === null || limit === undefined || limit < 0;

// ─── Add-ons (supplements sold on top of a plan) ─────────────────────────────

export const ADDON_RESOURCES = [
  'users',
  'warehouses',
  'deliveryPersons',
  'storageMb',
] as const;
export type AddonResource = (typeof ADDON_RESOURCES)[number];

/** Number of packs bought per resource, plus features enabled outside the plan. */
export interface TenantAddons {
  users?: number;
  warehouses?: number;
  deliveryPersons?: number;
  storageMb?: number;
  features?: PlanFeatures;
}

export interface AddonResourceDef {
  label: string;
  /** Limit units added by one pack (storage: MB). */
  unit: number;
  /** DH HT per pack per month. */
  priceMonthly: number;
}

export interface AddonFeatureDef {
  label: string;
  /** DH HT per month, charged only when the plan does not include it. */
  priceMonthly: number;
}

/**
 * Add-on price list (DH HT / month; yearly = 10 × monthly like plans).
 * Resource prices come from the published offer; feature prices are the
 * standalone price of a module the plan does not include.
 */
export const ADDON_CATALOGUE: {
  resources: Record<AddonResource, AddonResourceDef>;
  features: Record<PlanFeature, AddonFeatureDef>;
} = {
  resources: {
    users: { label: 'Utilisateur supplémentaire', unit: 1, priceMonthly: 49 },
    warehouses: { label: 'Dépôt supplémentaire', unit: 1, priceMonthly: 99 },
    deliveryPersons: { label: 'Pack 3 livreurs', unit: 3, priceMonthly: 79 },
    storageMb: {
      label: 'Pack 50 Go de stockage',
      unit: 51200,
      priceMonthly: 79,
    },
  },
  features: {
    pos: { label: 'Caisse (point de vente)', priceMonthly: 99 },
    delivery: { label: 'Gestion des livreurs', priceMonthly: 99 },
    client_portal: { label: 'Portail client', priceMonthly: 199 },
    reports: { label: 'Rapports avancés', priceMonthly: 99 },
  },
};

export interface PlanBase {
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxProducts: number;
  maxWarehouses: number;
  maxDeliveryPersons: number;
  maxOrdersPerMonth: number;
  maxStorageMb: number;
  features: PlanFeatures;
}

export interface EffectiveSubscription {
  maxUsers: number;
  maxProducts: number;
  maxWarehouses: number;
  maxDeliveryPersons: number;
  maxOrdersPerMonth: number;
  maxStorageMb: number;
  features: Record<PlanFeature, boolean>;
  pricing: {
    planMonthly: number;
    planYearly: number;
    addonsMonthly: number;
    totalMonthly: number;
    totalYearly: number;
    lines: Array<{
      key: string;
      label: string;
      quantity: number;
      priceMonthly: number;
    }>;
  };
}

/** Keeps only non-negative integer pack counts and boolean feature flags. */
export function sanitizeAddons(
  input: TenantAddons | null | undefined,
): TenantAddons {
  const out: TenantAddons = {};
  for (const key of ADDON_RESOURCES) {
    const n = Math.floor(Number(input?.[key] ?? 0));
    if (Number.isFinite(n) && n > 0) out[key] = Math.min(n, 1000);
  }
  const features: PlanFeatures = {};
  for (const f of PLAN_FEATURES) {
    if (input?.features?.[f] === true) features[f] = true;
  }
  if (Object.keys(features).length) out.features = features;
  return out;
}

/** Plan + add-ons → effective limits, features and price. Unlimited stays unlimited. */
export function computeSubscription(
  plan: PlanBase,
  rawAddons: TenantAddons | null | undefined,
): EffectiveSubscription {
  const addons = sanitizeAddons(rawAddons);
  const lines: EffectiveSubscription['pricing']['lines'] = [];
  const add = (base: number, key: AddonResource): number => {
    const qty = addons[key] ?? 0;
    if (!qty || isUnlimited(base)) return base;
    const def = ADDON_CATALOGUE.resources[key];
    lines.push({
      key,
      label: def.label,
      quantity: qty,
      priceMonthly: qty * def.priceMonthly,
    });
    return base + qty * def.unit;
  };

  const features = {} as Record<PlanFeature, boolean>;
  for (const f of PLAN_FEATURES) {
    const inPlan = plan.features?.[f] === true;
    const bought = addons.features?.[f] === true;
    features[f] = inPlan || bought;
    if (bought && !inPlan) {
      const def = ADDON_CATALOGUE.features[f];
      lines.push({
        key: `feature:${f}`,
        label: def.label,
        quantity: 1,
        priceMonthly: def.priceMonthly,
      });
    }
  }

  const result = {
    maxUsers: add(plan.maxUsers, 'users'),
    maxProducts: plan.maxProducts,
    maxWarehouses: add(plan.maxWarehouses, 'warehouses'),
    maxDeliveryPersons: add(plan.maxDeliveryPersons, 'deliveryPersons'),
    maxOrdersPerMonth: plan.maxOrdersPerMonth,
    maxStorageMb: add(plan.maxStorageMb, 'storageMb'),
    features,
  };
  const addonsMonthly = lines.reduce((s, l) => s + l.priceMonthly, 0);
  const planMonthly = Number(plan.priceMonthly) || 0;
  const planYearly = Number(plan.priceYearly) || 0;
  return {
    ...result,
    pricing: {
      planMonthly,
      planYearly,
      addonsMonthly,
      totalMonthly: planMonthly + addonsMonthly,
      totalYearly: planYearly + addonsMonthly * 10,
      lines,
    },
  };
}
