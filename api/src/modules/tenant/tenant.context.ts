import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context carried through each request via AsyncLocalStorage.
 * Populated by TenantMiddleware and read by TenantConnectionService.
 *
 * Using AsyncLocalStorage instead of REQUEST-scoped providers avoids
 * the NestJS DI overhead of creating new provider instances per request
 * (which cascades to every injected dependency in the tree).
 */
export interface TenantContext {
  tenantSlug: string;
  tenantId: number;
  tenantName: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();
