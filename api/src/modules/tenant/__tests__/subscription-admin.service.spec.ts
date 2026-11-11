import { NotFoundException } from '@nestjs/common';
import { SubscriptionAdminService } from '../subscription-admin.service';
import { computeSubscription } from '../plan-features';
import type { Tenant } from '../tenant.entity';

const plans: Record<string, any> = {
  business: {
    name: 'business',
    displayName: 'Business',
    priceMonthly: 349,
    priceYearly: 3490,
    currency: 'MAD',
    maxUsers: 5,
    maxProducts: 5000,
    maxWarehouses: 2,
    maxDeliveryPersons: 3,
    maxOrdersPerMonth: 5000,
    maxStorageMb: 10240,
    features: {
      pos: true,
      delivery: true,
      client_portal: false,
      reports: true,
    },
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    priceMonthly: 699,
    priceYearly: 6990,
    currency: 'MAD',
    maxUsers: 15,
    maxProducts: -1,
    maxWarehouses: 5,
    maxDeliveryPersons: -1,
    maxOrdersPerMonth: 20000,
    maxStorageMb: 51200,
    features: { pos: true, delivery: true, client_portal: true, reports: true },
  },
};

function makeTenant(): Tenant {
  const t = {
    id: 7,
    slug: 'acme',
    status: 'active',
    subscriptionPlan: 'business',
    addons: {},
    features: {},
  } as unknown as Tenant;
  Object.assign(t, computeSubscription(plans.business, {}));
  return t;
}

function setup(tenant: Tenant) {
  const tenantService = {
    findOne: jest.fn().mockResolvedValue(tenant),
    findPlan: jest.fn((name: string) => Promise.resolve(plans[name] ?? null)),
    applyPlanDefaults: jest.fn((t: Tenant, name: string) => {
      const eff = computeSubscription(plans[name], t.addons);
      Object.assign(t, {
        maxUsers: eff.maxUsers,
        maxProducts: eff.maxProducts,
        maxWarehouses: eff.maxWarehouses,
        maxDeliveryPersons: eff.maxDeliveryPersons,
        maxOrdersPerMonth: eff.maxOrdersPerMonth,
        maxStorageMb: eff.maxStorageMb,
        features: eff.features,
      });
      return Promise.resolve(true);
    }),
    saveAndRefresh: jest.fn((t: Tenant) => Promise.resolve(t)),
  };
  const entitlements = {
    usageForTenant: jest.fn().mockResolvedValue({
      users: { used: 4, max: 5 },
    }),
  };
  const activityRepo = {
    create: jest.fn((x: Record<string, unknown>) => x),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const service = new SubscriptionAdminService(
    tenantService as any,
    entitlements as any,
    activityRepo as any,
  );
  return { service, tenantService, activityRepo };
}

describe('SubscriptionAdminService', () => {
  it('describes plan, enforced limits, pricing and usage', async () => {
    const { service } = setup(makeTenant());
    const detail = await service.get(7);
    expect(detail.plan).toMatchObject({ name: 'business', priceMonthly: 349 });
    expect(detail.limits.maxUsers).toBe(5);
    expect(detail.customized).toBe(false);
    expect(detail.pricing?.totalMonthly).toBe(349);
    expect(detail.usage?.users).toEqual({ used: 4, max: 5 });
  });

  it('flags a hand-edited tenant as customized', async () => {
    const tenant = makeTenant();
    tenant.maxUsers = 50;
    const { service } = setup(tenant);
    expect((await service.get(7)).customized).toBe(true);
  });

  it('applies add-ons on top of the current plan and logs it', async () => {
    const { service, activityRepo } = setup(makeTenant());
    const detail = await service.update(
      7,
      { addons: { users: 3, features: { client_portal: true } } },
      'admin@example.com',
    );
    expect(detail.limits.maxUsers).toBe(8);
    expect(detail.features.client_portal).toBe(true);
    expect(detail.pricing?.totalMonthly).toBe(349 + 3 * 49 + 199);
    expect(activityRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'addons_updated',
        performedBy: 'admin@example.com',
      }),
    );
  });

  it('changes plan while keeping add-ons', async () => {
    const tenant = makeTenant();
    tenant.addons = { users: 2 };
    const { service, activityRepo } = setup(tenant);
    const detail = await service.update(7, { planName: 'pro' });
    expect(detail.plan).toMatchObject({ name: 'pro' });
    expect(detail.limits.maxUsers).toBe(17);
    expect(detail.limits.maxProducts).toBe(-1);
    expect(activityRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'plan_changed' }),
    );
  });

  it('rejects an unknown plan', async () => {
    const { service } = setup(makeTenant());
    await expect(service.update(7, { planName: 'gold' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
