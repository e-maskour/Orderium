/** Plan keys returned by the API (`tenant.subscriptionPlan`). */
export type SubscriptionPlanName = 'trial' | 'starter' | 'business' | 'pro' | 'enterprise';

/** Plan-level feature flags enforced by the API. */
export type SubscriptionFeature = 'pos' | 'delivery' | 'client_portal' | 'reports';

/** Quota-limited resources. */
export type SubscriptionResource =
  | 'users'
  | 'products'
  | 'warehouses'
  | 'deliveryPersons'
  | 'ordersPerMonth'
  | 'storageMb';

/** `max`: -1 = unlimited, 0 = not included in the plan. */
export interface SubscriptionUsage {
  used: number;
  max: number;
}

export interface CurrentSubscription {
  plan: { name: SubscriptionPlanName | string; displayName?: string };
  status: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  features: Partial<Record<SubscriptionFeature, boolean>>;
  limits: Partial<Record<SubscriptionResource, SubscriptionUsage>>;
}

/** Display order of the features and limits on the subscription page. */
export const SUBSCRIPTION_FEATURES: SubscriptionFeature[] = [
  'pos',
  'delivery',
  'client_portal',
  'reports',
];

export const SUBSCRIPTION_RESOURCES: SubscriptionResource[] = [
  'users',
  'products',
  'warehouses',
  'deliveryPersons',
  'ordersPerMonth',
  'storageMb',
];

/** Commercial display names — identical in French and Arabic UIs. */
export const PLAN_DISPLAY_NAMES: Record<SubscriptionPlanName, string> = {
  trial: 'Essai gratuit',
  starter: 'Starter',
  business: 'Business',
  pro: 'Pro',
  enterprise: 'Entreprise',
};

/** Sales contact used by the "Changer d'offre" call-to-action. */
export const SUBSCRIPTION_SALES_WHATSAPP = '212666473116';
