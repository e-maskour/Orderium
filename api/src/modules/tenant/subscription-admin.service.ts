import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantService } from './tenant.service';
import {
  PlanEntitlementsService,
  type PlanUsage,
} from './plan-entitlements.service';
import { TenantActivityLog } from '../tenant-lifecycle/entities/tenant-activity-log.entity';
import type { SubscriptionPlan as SubscriptionPlanEntity } from '../tenant-lifecycle/entities/subscription-plan.entity';
import type { Tenant } from './tenant.entity';
import {
  ADDON_CATALOGUE,
  PLAN_FEATURES,
  computeSubscription,
  sanitizeAddons,
  type EffectiveSubscription,
} from './plan-features';
import type { UpdateTenantSubscriptionDto } from './dto/update-tenant-subscription.dto';

const LIMIT_KEYS = [
  'maxUsers',
  'maxProducts',
  'maxWarehouses',
  'maxDeliveryPersons',
  'maxOrdersPerMonth',
  'maxStorageMb',
] as const;

/** Super-admin view and management of one tenant's subscription. */
@Injectable()
export class SubscriptionAdminService {
  private readonly logger = new Logger(SubscriptionAdminService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly entitlements: PlanEntitlementsService,
    @InjectRepository(TenantActivityLog, 'master')
    private readonly activityRepo: Repository<TenantActivityLog>,
  ) {}

  catalogue() {
    return ADDON_CATALOGUE;
  }

  async get(id: number) {
    const tenant = await this.tenantService.findOne(id);
    const plan = await this.tenantService.findPlan(tenant.subscriptionPlan);
    return this.describe(tenant, plan);
  }

  async update(
    id: number,
    dto: UpdateTenantSubscriptionDto,
    performedBy?: string,
  ) {
    const tenant = await this.tenantService.findOne(id);
    const previous = {
      plan: tenant.subscriptionPlan,
      addons: tenant.addons ?? {},
    };
    const planName = dto.planName ?? tenant.subscriptionPlan;
    const plan = await this.tenantService.findPlan(planName);
    if (!plan) throw new NotFoundException(`Unknown plan '${planName}'`);

    tenant.subscriptionPlan = planName as Tenant['subscriptionPlan'];
    if (dto.addons !== undefined) tenant.addons = sanitizeAddons(dto.addons);
    await this.tenantService.applyPlanDefaults(tenant, planName);
    const saved = await this.tenantService.saveAndRefresh(tenant);

    await this.log(
      saved.id,
      previous.plan !== planName ? 'plan_changed' : 'addons_updated',
      { from: previous, to: { plan: planName, addons: saved.addons } },
      performedBy,
    );
    return this.describe(saved, plan);
  }

  private async describe(tenant: Tenant, plan: SubscriptionPlanEntity | null) {
    const addons = sanitizeAddons(tenant.addons);
    const computed: EffectiveSubscription | null = plan
      ? computeSubscription(plan, addons)
      : null;
    const limits = Object.fromEntries(
      LIMIT_KEYS.map((k) => [k, tenant[k]]),
    ) as Record<(typeof LIMIT_KEYS)[number], number>;
    const features = Object.fromEntries(
      PLAN_FEATURES.map((f) => [f, tenant.features?.[f] === true]),
    );
    // Manual overrides from the edit form make the row differ from plan + add-ons.
    const customized =
      !!computed &&
      (LIMIT_KEYS.some((k) => computed[k] !== tenant[k]) ||
        PLAN_FEATURES.some((f) => computed.features[f] !== features[f]));

    let usage: PlanUsage | null = null;
    try {
      usage = await this.entitlements.usageForTenant(tenant);
    } catch (err) {
      this.logger.warn(
        `Usage unavailable for '${tenant.slug}': ${(err as Error).message}`,
      );
    }

    return {
      tenantId: tenant.id,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      subscriptionStartedAt: tenant.subscriptionStartedAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      autoRenew: tenant.autoRenew,
      plan: plan
        ? {
            name: plan.name,
            displayName: plan.displayName,
            priceMonthly: plan.priceMonthly,
            priceYearly: plan.priceYearly,
            currency: plan.currency,
            maxUsers: plan.maxUsers,
            maxProducts: plan.maxProducts,
            maxWarehouses: plan.maxWarehouses,
            maxDeliveryPersons: plan.maxDeliveryPersons,
            maxOrdersPerMonth: plan.maxOrdersPerMonth,
            maxStorageMb: plan.maxStorageMb,
            features: plan.features,
          }
        : {
            name: tenant.subscriptionPlan,
            displayName: tenant.subscriptionPlan,
          },
      addons,
      /** What the API enforces right now (tenant row). */
      limits,
      features,
      /** True when the tenant row was edited by hand away from plan + add-ons. */
      customized,
      pricing: computed?.pricing ?? null,
      usage,
      catalogue: ADDON_CATALOGUE,
    };
  }

  private async log(
    tenantId: number,
    action: string,
    details: Record<string, unknown>,
    performedBy?: string,
  ): Promise<void> {
    try {
      await this.activityRepo.save(
        this.activityRepo.create({
          tenantId,
          action,
          details,
          performedBy: performedBy ?? null,
        }),
      );
    } catch (err) {
      this.logger.warn(`Failed to log activity: ${(err as Error).message}`);
    }
  }
}
