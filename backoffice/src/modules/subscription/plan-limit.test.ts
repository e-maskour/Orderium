import { describe, expect, it } from 'vitest';
import { isLimitReached } from './plan-limit';
import { planLimitForPath } from '../../lib/planAccess';

describe('isLimitReached', () => {
  it('is reached once usage meets the limit', () => {
    expect(isLimitReached({ used: 100, max: 100 })).toBe(true);
    expect(isLimitReached({ used: 468, max: 100 })).toBe(true);
    expect(isLimitReached({ used: 99, max: 100 })).toBe(false);
  });

  it('treats -1 as unlimited and 0 as not included', () => {
    expect(isLimitReached({ used: 5000, max: -1 })).toBe(false);
    expect(isLimitReached({ used: 0, max: 0 })).toBe(true);
  });

  it('fails open when usage is unknown', () => {
    expect(isLimitReached(undefined)).toBe(false);
  });
});

describe('planLimitForPath', () => {
  it('gates only the create screens', () => {
    expect(planLimitForPath('/products/create')).toBe('products');
    expect(planLimitForPath('/products/create/')).toBe('products');
    expect(planLimitForPath('/bons-livraison/create')).toBe('ordersPerMonth');
    expect(planLimitForPath('/bon-achat/create')).toBe('ordersPerMonth');
    expect(planLimitForPath('/pos')).toBe('ordersPerMonth');
    expect(planLimitForPath('/checkout')).toBe('ordersPerMonth');
  });

  it('leaves lists, details and the POS success page open', () => {
    expect(planLimitForPath('/products')).toBeNull();
    expect(planLimitForPath('/products/42')).toBeNull();
    expect(planLimitForPath('/orders')).toBeNull();
    expect(planLimitForPath('/checkout/success')).toBeNull();
  });
});
