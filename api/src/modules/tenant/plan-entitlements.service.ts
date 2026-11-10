import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantConnectionService } from './tenant-connection.service';
import { tenantStorage } from './tenant.context';
import type { Tenant } from './tenant.entity';
import {
  FEATURE_LABELS,
  RESOURCE_LABELS,
  isUnlimited,
  type PlanFeature,
  type PlanResource,
} from './plan-features';

export interface QuotaLine {
  used: number;
  /** -1 = unlimited */
  max: number;
}

export type PlanUsage = Record<PlanResource, QuotaLine>;

const STORAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const MB = 1024 * 1024;

/**
 * Enforces the current tenant's subscription plan: feature flags and
 * resource limits. Limits and features live on the tenant row (copied from
 * the plan, overridable per tenant), so this never reads the plan catalogue.
 *
 * Every check is a no-op outside a tenant context (seeders, super-admin
 * routes, background jobs), which keeps provisioning and imports working.
 */
@Injectable()
export class PlanEntitlementsService {
  private readonly logger = new Logger(PlanEntitlementsService.name);
  /** slug → { bytes, at } — bucket listing is too slow to run per upload. */
  private readonly storageCache = new Map<
    string,
    { bytes: number; at: number }
  >();

  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantConn: TenantConnectionService,
  ) {}

  // ─── Context ────────────────────────────────────────────────────────────

  async currentTenant(): Promise<Tenant | null> {
    const slug = tenantStorage.getStore()?.tenantSlug;
    if (!slug) return null;
    return this.tenantService.getTenantBySlug(slug);
  }

  hasFeature(tenant: Tenant, feature: PlanFeature): boolean {
    return tenant.features?.[feature] === true;
  }

  // ─── Features ───────────────────────────────────────────────────────────

  async assertFeature(feature: PlanFeature): Promise<void> {
    const tenant = await this.currentTenant();
    if (!tenant || this.hasFeature(tenant, feature)) return;
    throw new ForbiddenException({
      error: 'PLAN_FEATURE_UNAVAILABLE',
      feature,
      plan: tenant.subscriptionPlan,
      message: `Votre abonnement n'inclut pas ${FEATURE_LABELS[feature]}. Passez à une offre supérieure pour l'activer.`,
    });
  }

  // ─── Limits ─────────────────────────────────────────────────────────────

  /**
   * Throws when adding `incoming` units of `resource` would exceed the plan.
   * For storage, `incoming` is in bytes.
   */
  async assertCanAdd(resource: PlanResource, incoming = 1): Promise<void> {
    const tenant = await this.currentTenant();
    if (!tenant) return;
    const max = this.limitOf(tenant, resource);
    if (isUnlimited(max)) return;

    if (resource === 'storageMb') {
      const usedBytes = await this.storageBytes(tenant.slug);
      if (usedBytes + incoming <= max * MB) return;
      this.throwLimit(tenant, resource, max, Math.round(usedBytes / MB));
    }

    const used = await this.countUsed(resource);
    if (used + incoming <= max) return;
    this.throwLimit(tenant, resource, max, used);
  }

  /** Call after a successful upload so the cached bucket size stays close. */
  recordStorage(bytes: number): void {
    const slug = tenantStorage.getStore()?.tenantSlug;
    const entry = slug ? this.storageCache.get(slug) : undefined;
    if (entry) entry.bytes += bytes;
  }

  async usage(tenant: Tenant): Promise<PlanUsage> {
    const resources: PlanResource[] = [
      'users',
      'products',
      'warehouses',
      'deliveryPersons',
      'ordersPerMonth',
    ];
    const counts = await Promise.all(resources.map((r) => this.countUsed(r)));
    const result = {} as PlanUsage;
    resources.forEach((r, i) => {
      result[r] = { used: counts[i], max: this.limitOf(tenant, r) };
    });
    const bytes = await this.storageBytes(tenant.slug);
    result.storageMb = {
      used: Math.round(bytes / MB),
      max: this.limitOf(tenant, 'storageMb'),
    };
    return result;
  }

  // ─── Internals ──────────────────────────────────────────────────────────

  private limitOf(tenant: Tenant, resource: PlanResource): number {
    switch (resource) {
      case 'users':
        return tenant.maxUsers;
      case 'products':
        return tenant.maxProducts;
      case 'warehouses':
        return tenant.maxWarehouses;
      case 'deliveryPersons':
        return tenant.maxDeliveryPersons;
      case 'ordersPerMonth':
        return tenant.maxOrdersPerMonth;
      case 'storageMb':
        return tenant.maxStorageMb;
    }
  }

  private async countUsed(resource: PlanResource): Promise<number> {
    const sql: Record<Exclude<PlanResource, 'storageMb'>, string> = {
      // Only back-office staff consume seats; portal customers are unlimited.
      users: `SELECT COUNT(*)::int AS c FROM portal WHERE "userType" = 'admin' OR "isAdmin" = true`,
      products: `SELECT COUNT(*)::int AS c FROM products`,
      warehouses: `SELECT COUNT(*)::int AS c FROM warehouses`,
      deliveryPersons: `SELECT COUNT(*)::int AS c FROM delivery_persons`,
      ordersPerMonth: `SELECT COUNT(*)::int AS c FROM orders WHERE "dateCreated" >= date_trunc('month', now())`,
    };
    if (resource === 'storageMb') return 0;
    const ds = this.tenantConn.getCurrentDataSource();
    const [row] = await ds.query<Array<{ c: number }>>(sql[resource]);
    return Number(row?.c ?? 0);
  }

  private async storageBytes(slug: string): Promise<number> {
    const cached = this.storageCache.get(slug);
    if (cached && Date.now() - cached.at < STORAGE_CACHE_TTL_MS) {
      return cached.bytes;
    }
    try {
      const bytes = await this.tenantService.getMinioBucketSize(slug);
      this.storageCache.set(slug, { bytes, at: Date.now() });
      return bytes;
    } catch (err) {
      // Fail open: a storage outage must not block every upload.
      this.logger.warn(
        `Storage size unavailable for '${slug}': ${(err as Error).message}`,
      );
      return 0;
    }
  }

  private throwLimit(
    tenant: Tenant,
    resource: PlanResource,
    limit: number,
    used: number,
  ): never {
    throw new ForbiddenException({
      error: 'PLAN_LIMIT_REACHED',
      resource,
      limit,
      used,
      plan: tenant.subscriptionPlan,
      message: `Limite de votre abonnement atteinte : ${limit} ${RESOURCE_LABELS[resource]} maximum. Passez à une offre supérieure ou ajoutez une option pour continuer.`,
    });
  }
}
