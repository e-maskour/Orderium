/**
 * Client-portal route paths and the query contract the shop reads its
 * filters from. Keep landing-page links and the shop's filter state in sync
 * by going through these helpers rather than hardcoding paths.
 */
export const HOME_PATH = '/';
export const SHOP_PATH = '/shop';

export const SHOP_PARAMS = {
  CATEGORY: 'categoryId',
  BRAND: 'brandId',
} as const;

export interface ShopFilterParams {
  categoryId?: number | null;
  brandId?: number | null;
}

/** Builds `/shop?categoryId=3` style links; omits empty filters. */
export const shopPath = ({ categoryId, brandId }: ShopFilterParams = {}): string => {
  const params = new URLSearchParams();
  if (categoryId != null) params.set(SHOP_PARAMS.CATEGORY, String(categoryId));
  if (brandId != null) params.set(SHOP_PARAMS.BRAND, String(brandId));
  const query = params.toString();
  return query ? `${SHOP_PATH}?${query}` : SHOP_PATH;
};

/** Parses a query-string value into a filter id, tolerating junk input. */
export const parseFilterId = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed !== 0 ? parsed : null;
};
