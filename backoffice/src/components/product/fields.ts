/**
 * Stable DOM ids for every product form control.
 *
 * These are the anchor targets the form-level error summary focuses, so
 * they must stay in sync with the `name` of the matching schema field —
 * the key here IS the field name.
 */
export const FIELD_IDS = {
  name: 'pf-name',
  code: 'pf-code',
  description: 'pf-description',
  price: 'pf-price',
  saleUnitId: 'pf-sale-unit',
  saleTaxId: 'pf-sale-tax',
  minPrice: 'pf-min-price',
  cost: 'pf-cost',
  purchaseUnitId: 'pf-purchase-unit',
  purchaseTaxId: 'pf-purchase-tax',
  warehouseId: 'pf-warehouse',
  categoryIds: 'pf-categories',
  brandId: 'pf-brand',
} as const;
