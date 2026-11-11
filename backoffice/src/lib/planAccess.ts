import type { TenantModules } from '../api/onboarding';
import type { SubscriptionResource } from '../modules/subscription/subscription.interface';

/**
 * Screens that only exist when the tenant's subscription plan includes them.
 *
 * The public-status endpoint already masks `modules` with the plan, so this
 * map is the single place that ties a URL prefix to the flag that unlocks it.
 * It drives the route gate, the header search and any in-page shortcut.
 */
export type PlanGatedModule = 'pos' | 'caisse' | 'reports' | 'delivery' | 'clientRequests';

interface PlanGatedRoute {
  prefix: string;
  module: PlanGatedModule;
}

export const PLAN_GATED_ROUTES: PlanGatedRoute[] = [
  { prefix: '/pos', module: 'pos' },
  // POS checkout flow (/checkout, /checkout/success) belongs to the POS feature.
  { prefix: '/checkout', module: 'pos' },
  { prefix: '/caisse', module: 'caisse' },
  { prefix: '/analytics', module: 'reports' },
  { prefix: '/delivery-persons', module: 'delivery' },
  { prefix: '/client-requests', module: 'clientRequests' },
];

/** Whether the plan-gated module is enabled. Absent flags count as enabled. */
export function isPlanModuleEnabled(module: PlanGatedModule, modules: TenantModules): boolean {
  switch (module) {
    case 'pos':
      return modules.pos !== false;
    case 'caisse':
      return modules.caisse !== false;
    case 'reports':
      return modules.reports !== false;
    case 'delivery':
      return modules.livreurs !== false;
    case 'clientRequests':
      return modules.clientRequests !== false;
  }
}

/** The plan-gated module a path belongs to, or null when the path is not gated. */
export function planModuleForPath(pathname: string): PlanGatedModule | null {
  const match = PLAN_GATED_ROUTES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'),
  );
  return match?.module ?? null;
}

/**
 * Create screens that consume a plan quota. When the quota is used up, only
 * these screens are replaced by the "limit reached" screen; the lists, detail
 * and edit pages keep working. Matched exactly (`/checkout/success` is not gated).
 */
export const PLAN_LIMITED_ROUTES: Array<{ path: string; resource: SubscriptionResource }> = [
  { path: '/products/create', resource: 'products' },
  { path: '/bons-livraison/create', resource: 'ordersPerMonth' },
  { path: '/bon-achat/create', resource: 'ordersPerMonth' },
  { path: '/pos', resource: 'ordersPerMonth' },
  { path: '/checkout', resource: 'ordersPerMonth' },
];

/** The quota a create screen consumes, or null when the path is not a gated create screen. */
export function planLimitForPath(pathname: string): SubscriptionResource | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PLAN_LIMITED_ROUTES.find((r) => r.path === path)?.resource ?? null;
}

/** False when the path belongs to a module the current plan does not include. */
export function isPathAllowedByPlan(pathname: string, modules: TenantModules): boolean {
  const module = planModuleForPath(pathname);
  return module ? isPlanModuleEnabled(module, modules) : true;
}
