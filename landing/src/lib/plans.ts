/**
 * Marnova subscription plans as sold on the landing page. Prices are MAD, excluding VAT (HT).
 * Yearly = 10 × monthly (2 months free). -1 means unlimited. Copy lives in the dictionaries.
 */
export type PlanKey = 'starter' | 'business' | 'pro' | 'enterprise';

export type Plan = {
  key: PlanKey;
  priceMonthly: number;
  priceYearly: number;
  users: number;
  products: number;
  warehouses: number;
  deliveryPersons: number;
  storageGb: number;
  pos: boolean;
  delivery: boolean;
  clientPortal: boolean;
  reports: boolean;
  featured?: boolean;
  /** Price is a starting point, final offer on quote. */
  fromPrice?: boolean;
};

export const PLANS: Plan[] = [
  { key: 'starter', priceMonthly: 149, priceYearly: 1490, users: 2, products: 500, warehouses: 1, deliveryPersons: 0, storageGb: 1, pos: false, delivery: false, clientPortal: false, reports: false },
  { key: 'business', priceMonthly: 349, priceYearly: 3490, users: 5, products: 5000, warehouses: 2, deliveryPersons: 3, storageGb: 10, pos: true, delivery: true, clientPortal: false, reports: true, featured: true },
  { key: 'pro', priceMonthly: 699, priceYearly: 6990, users: 15, products: -1, warehouses: 5, deliveryPersons: -1, storageGb: 50, pos: true, delivery: true, clientPortal: true, reports: true },
  { key: 'enterprise', priceMonthly: 1490, priceYearly: 14900, users: -1, products: -1, warehouses: -1, deliveryPersons: -1, storageGb: 200, pos: true, delivery: true, clientPortal: true, reports: true, fromPrice: true },
];

export const TRIAL_DAYS = 14;

/** Per-month equivalent of the yearly price, rounded down to the dirham. */
export const yearlyPerMonth = (p: Plan) => Math.floor(p.priceYearly / 12);

/** French grouping with a non-breaking space: 14900 → "14 900". */
export const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
