import { SetMetadata } from '@nestjs/common';
import type { PlanFeature } from '../plan-features';

export const REQUIRE_PLAN_FEATURE_KEY = 'requirePlanFeature';

/**
 * Restricts a controller or handler to tenants whose subscription includes
 * `feature`. Enforced by the global PlanFeatureGuard (403
 * `PLAN_FEATURE_UNAVAILABLE` otherwise).
 *
 * @example @RequirePlanFeature('reports')
 */
export const RequirePlanFeature = (feature: PlanFeature) =>
  SetMetadata(REQUIRE_PLAN_FEATURE_KEY, feature);
