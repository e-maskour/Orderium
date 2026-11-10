/** Calculate available quantity, safely parsing decimal/string values from the DB */
export function calcAvailableQty(
  quantity: unknown,
  reservedQuantity: unknown,
): number {
  const qty = parseFloat(String(quantity) || '0');
  const reserved = parseFloat(String(reservedQuantity) || '0');
  return qty - reserved;
}

/**
 * Parse an inclusive end-date filter. A date-only value ("YYYY-MM-DD") is
 * extended to the last millisecond of that day so the whole day is included.
 */
export function parseEndDateFilter(value: string): Date {
  const date = new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

/**
 * Build list metadata in the shared PaginationMeta shape. When neither page
 * nor limit was requested every matching row is returned, so limit = total.
 */
export function buildListMeta(
  filters: { page?: number; limit?: number },
  total: number,
  returned: number,
): {
  limit: number;
  offset: number;
  total: number;
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const paginated = !!(filters.page || filters.limit);
  const limit = paginated ? (filters.limit ?? 25) : total;
  const page = paginated ? (filters.page ?? 1) : 1;
  const offset = paginated ? (page - 1) * limit : 0;
  return {
    limit,
    offset,
    total,
    page,
    hasNext: paginated ? offset + returned < total : false,
    hasPrev: offset > 0,
  };
}
