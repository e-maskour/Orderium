import {
  computeSubscription,
  sanitizeAddons,
  type PlanBase,
} from '../plan-features';

const business: PlanBase = {
  priceMonthly: 349,
  priceYearly: 3490,
  maxUsers: 5,
  maxProducts: 5000,
  maxWarehouses: 2,
  maxDeliveryPersons: 3,
  maxOrdersPerMonth: 5000,
  maxStorageMb: 10240,
  features: { pos: true, delivery: true, client_portal: false, reports: true },
};

const pro: PlanBase = {
  ...business,
  priceMonthly: 699,
  priceYearly: 6990,
  maxUsers: 15,
  maxProducts: -1,
  maxWarehouses: 5,
  maxDeliveryPersons: -1,
  features: { pos: true, delivery: true, client_portal: true, reports: true },
};

describe('computeSubscription', () => {
  it('returns the plan as-is without add-ons', () => {
    const eff = computeSubscription(business, {});
    expect(eff.maxUsers).toBe(5);
    expect(eff.features.client_portal).toBe(false);
    expect(eff.pricing).toMatchObject({
      planMonthly: 349,
      addonsMonthly: 0,
      totalMonthly: 349,
      totalYearly: 3490,
      lines: [],
    });
  });

  it('adds packs to limits and prices them', () => {
    const eff = computeSubscription(business, {
      users: 2,
      warehouses: 1,
      deliveryPersons: 1,
      storageMb: 1,
    });
    expect(eff.maxUsers).toBe(7);
    expect(eff.maxWarehouses).toBe(3);
    expect(eff.maxDeliveryPersons).toBe(6); // packs of 3
    expect(eff.maxStorageMb).toBe(10240 + 51200); // packs of 50 GB
    expect(eff.pricing.addonsMonthly).toBe(2 * 49 + 99 + 79 + 79);
    expect(eff.pricing.totalMonthly).toBe(349 + 355);
    expect(eff.pricing.totalYearly).toBe(3490 + 355 * 10);
  });

  it('enables a feature bought outside the plan and charges it', () => {
    const eff = computeSubscription(business, {
      features: { client_portal: true },
    });
    expect(eff.features.client_portal).toBe(true);
    expect(eff.pricing.lines).toEqual([
      expect.objectContaining({
        key: 'feature:client_portal',
        priceMonthly: 199,
      }),
    ]);
  });

  it('does not charge a feature the plan already includes', () => {
    const eff = computeSubscription(pro, { features: { client_portal: true } });
    expect(eff.pricing.addonsMonthly).toBe(0);
  });

  it('ignores packs on unlimited limits', () => {
    const eff = computeSubscription(pro, { deliveryPersons: 4 });
    expect(eff.maxDeliveryPersons).toBe(-1);
    expect(eff.pricing.addonsMonthly).toBe(0);
  });
});

describe('sanitizeAddons', () => {
  it('drops negative, zero, fractional and unknown values', () => {
    expect(
      sanitizeAddons({
        users: -3,
        warehouses: 0,
        deliveryPersons: 2.7,
        storageMb: Number.NaN,
        features: { pos: true, reports: false },
        // @ts-expect-error unknown keys are stripped
        hacked: 99,
      }),
    ).toEqual({ deliveryPersons: 2, features: { pos: true } });
  });
});
