import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export const SORT_ORDERS = ['ASC', 'DESC'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface ListSort<F extends string = string> {
  field?: F;
  order?: SortOrder;
}

/**
 * class-transformer helper for `sortOrder` DTO fields: accepts `asc`/`desc`
 * in any case and turns an empty string into `undefined`.
 */
export const toSortOrder = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value === ''
      ? undefined
      : value.toUpperCase()
    : value;

/**
 * Applies a whitelisted sort to a list query.
 *
 * `columns` maps each public sort field to one or more query-builder columns
 * (`alias.property`); a field missing from the map — or no field at all —
 * falls back to the default ordering. The default ordering is always appended
 * as a tie-breaker so paginated results stay stable.
 */
export function applyListSort<E extends ObjectLiteral, F extends string>(
  qb: SelectQueryBuilder<E>,
  sort: ListSort<F> | undefined,
  columns: Partial<Record<F, string | string[]>>,
  fallback: { column: string; order: SortOrder },
): SelectQueryBuilder<E> {
  const mapped = sort?.field ? columns[sort.field] : undefined;
  if (!mapped) return qb.orderBy(fallback.column, fallback.order);

  const order: SortOrder = sort?.order ?? 'ASC';
  const list = Array.isArray(mapped) ? mapped : [mapped];
  list.forEach((column, i) => {
    if (i === 0) qb.orderBy(column, order, 'NULLS LAST');
    else qb.addOrderBy(column, order, 'NULLS LAST');
  });
  if (!list.includes(fallback.column)) {
    qb.addOrderBy(fallback.column, fallback.order);
  }
  return qb;
}

/**
 * Partner column(s) for a document list: the customer for sales, the
 * supplier for purchases, both (customer first) when no direction is given.
 */
export function partnerSortColumns(
  direction: 'ACHAT' | 'VENTE' | undefined,
): string[] {
  if (direction === 'ACHAT') return ['supplier.name'];
  if (direction === 'VENTE') return ['customer.name'];
  return ['customer.name', 'supplier.name'];
}
