import { ValueTransformer } from 'typeorm';

/**
 * Transforms decimal/numeric columns to ensure they are always returned as JS numbers.
 * TypeORM returns decimal columns as strings from PostgreSQL — this fixes that.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    return value;
  },
  from: (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    return parseFloat(String(value));
  },
};

/**
 * Same as numericTransformer but preserves null values (for nullable columns).
 */
export const nullableNumericTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    return value;
  },
  from: (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    return parseFloat(String(value));
  },
};
