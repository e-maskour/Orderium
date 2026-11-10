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
