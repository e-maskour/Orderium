/**
 * CommonJS stand-in for the `uuid` package under Jest.
 *
 * uuid v13 is ESM-only, which Jest's CommonJS runtime cannot load, and any
 * test that transitively imports a service using it — the route coverage
 * audit, for instance — dies at import time. This returns genuine v4 UUIDs
 * from the platform, so behaviour under test is unchanged.
 */
import { randomUUID } from 'crypto';

export const v4 = (): string => randomUUID();
export const v1 = (): string => randomUUID();
export const validate = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
