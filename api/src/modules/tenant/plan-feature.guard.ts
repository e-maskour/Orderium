import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PLAN_FEATURE_KEY } from './decorators/require-plan-feature.decorator';
import { PlanEntitlementsService } from './plan-entitlements.service';
import type { PlanFeature } from './plan-features';

interface RequestUser {
  scope?: 'portal' | 'admin';
  isCustomer?: boolean;
}

/**
 * Global guard enforcing subscription feature flags.
 *
 * 1. Routes marked @RequirePlanFeature(feature) need that feature.
 * 2. Every portal-scoped token is gated by the app it comes from, so a plan
 *    without the customer portal (or delivery) cannot be reached through
 *    any shared portal route (products, orders, notifications, pdf…):
 *      - customer token (isCustomer) → `client_portal`
 *      - delivery-person token       → `delivery`
 */
@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: PlanEntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<PlanFeature | undefined>(
      REQUIRE_PLAN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (feature) await this.entitlements.assertFeature(feature);

    const user = context
      .switchToHttp()
      .getRequest<{ user?: RequestUser }>().user;
    if (user?.scope === 'portal') {
      await this.entitlements.assertFeature(
        user.isCustomer ? 'client_portal' : 'delivery',
      );
    }
    return true;
  }
}
