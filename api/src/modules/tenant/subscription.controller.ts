import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiRes } from '../../common/api-response';
import { SUB } from '../../common/response-codes';
import { NoPermissionRequired } from '../auth/decorators/permissions.decorator';
import { PlanEntitlementsService } from './plan-entitlements.service';
import { PLAN_FEATURES } from './plan-features';

/**
 * The calling tenant's own subscription: plan, feature flags and quota usage.
 * Lets the back-office hide modules the plan does not include and show
 * "x / y" usage before a limit is hit.
 */
@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly entitlements: PlanEntitlementsService) {}

  @Get('current')
  @NoPermissionRequired()
  @ApiOperation({ summary: "Current tenant's plan, features and usage" })
  @ApiResponse({ status: 200, description: 'Current subscription' })
  async current() {
    const tenant = await this.entitlements.currentTenant();
    if (!tenant) throw new NotFoundException('No tenant context');
    const features = Object.fromEntries(
      PLAN_FEATURES.map((f) => [f, this.entitlements.hasFeature(tenant, f)]),
    );
    return ApiRes(SUB.CURRENT, {
      plan: { name: tenant.subscriptionPlan },
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      features,
      limits: await this.entitlements.usage(tenant),
    });
  }
}
