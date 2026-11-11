import type { TenantModules } from '../api/onboarding';

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

/** False when the path belongs to a module the current plan does not include. */
export function isPathAllowedByPlan(pathname: string, modules: TenantModules): boolean {
  const module = planModuleForPath(pathname);
  return module ? isPlanModuleEnabled(module, modules) : true;
}
