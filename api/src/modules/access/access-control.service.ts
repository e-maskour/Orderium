import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

/** A user's fully resolved rights, as returned to guards and to the client. */
export interface EffectiveAccess {
  userId: number;
  /** Directly assigned roles, before implications are expanded. */
  roleIds: number[];
  roleNames: string[];
  /** True when any held role — direct or implied — bypasses all checks. */
  isSuperAdmin: boolean;
  /** Sorted, de-duplicated permission keys. */
  permissions: string[];
}

interface RoleNode {
  id: number;
  name: string;
  isSuperAdmin: boolean;
  permissions: string[];
  implies: number[];
}

/**
 * Resolves and caches effective permissions, the Odoo `res.groups` model:
 * a user's rights are the union of every role they hold plus the transitive
 * closure of everything those roles imply.
 *
 * Freshness. Permissions are resolved server-side per request rather than
 * carried in the JWT, so editing a role takes effect immediately instead of
 * at the next login. Two cache entries back this up — the tenant's whole role
 * graph, and each user's resolved access — both namespaced by a per-tenant
 * epoch. Any write to roles, permissions or assignments bumps the epoch, which
 * orphans every entry at once: invalidation is a single cache write regardless
 * of how many users are online. The cache is the application `CacheModule`,
 * so with `REDIS_URL` set the invalidation is shared across API instances.
 *
 * The epoch is seeded from `Date.now()` and only ever moves forward, so a cache
 * eviction cannot resurrect entries written under an earlier epoch.
 */
@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  /** A resolved user is cheap to recompute; keep it short. */
  private static readonly USER_TTL_MS = 300_000;
  private static readonly GRAPH_TTL_MS = 300_000;
  private static readonly EPOCH_TTL_MS = 86_400_000;

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ─── Cache keys ────────────────────────────────────────────────────────────

  private get tenantSlug(): string {
    return this.tenantConnService.getCurrentTenantSlug();
  }

  private epochKey(slug: string): string {
    return `tenant:${slug}:acl:epoch`;
  }

  private async currentEpoch(slug: string): Promise<number> {
    const existing = await this.cacheManager.get<number>(this.epochKey(slug));
    if (typeof existing === 'number') return existing;
    const seeded = Date.now();
    await this.cacheManager.set(
      this.epochKey(slug),
      seeded,
      AccessControlService.EPOCH_TTL_MS,
    );
    return seeded;
  }

  /**
   * Invalidate every cached resolution for the current tenant. Call after any
   * write that can change what somebody is allowed to do.
   */
  async invalidate(): Promise<void> {
    await this.invalidateTenant(this.tenantSlug);
  }

  async invalidateTenant(slug: string): Promise<void> {
    const previous = await this.cacheManager.get<number>(this.epochKey(slug));
    // Monotonic even when two invalidations land in the same millisecond.
    const next = Math.max((previous ?? 0) + 1, Date.now());
    await this.cacheManager.set(
      this.epochKey(slug),
      next,
      AccessControlService.EPOCH_TTL_MS,
    );
    this.logger.debug(`Access cache invalidated for tenant "${slug}"`);
  }

  // ─── Resolution ────────────────────────────────────────────────────────────

  async getEffectiveAccess(userId: number): Promise<EffectiveAccess> {
    const slug = this.tenantSlug;
    const epoch = await this.currentEpoch(slug);
    const key = `tenant:${slug}:acl:v${epoch}:u${userId}`;

    const cached = await this.cacheManager.get<EffectiveAccess>(key);
    if (cached) return cached;

    const resolved = await this.resolve(userId, slug, epoch);
    await this.cacheManager.set(
      key,
      resolved,
      AccessControlService.USER_TTL_MS,
    );
    return resolved;
  }

  async hasPermission(userId: number, permission: string): Promise<boolean> {
    const access = await this.getEffectiveAccess(userId);
    return access.isSuperAdmin || access.permissions.includes(permission);
  }

  private async resolve(
    userId: number,
    slug: string,
    epoch: number,
  ): Promise<EffectiveAccess> {
    const graph = await this.getRoleGraph(slug, epoch);
    const directRoleIds = await this.getDirectRoleIds(userId);

    // Breadth-first over `implies`, with a visited set so that a cyclic
    // configuration cannot loop forever.
    const visited = new Set<number>();
    const queue = [...directRoleIds];
    while (queue.length) {
      const id = queue.shift() as number;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = graph.get(id);
      if (!node) continue;
      for (const impliedId of node.implies) {
        if (!visited.has(impliedId)) queue.push(impliedId);
      }
    }

    const permissions = new Set<string>();
    let isSuperAdmin = false;
    for (const id of visited) {
      const node = graph.get(id);
      if (!node) continue;
      if (node.isSuperAdmin) isSuperAdmin = true;
      for (const key of node.permissions) permissions.add(key);
    }

    return {
      userId,
      roleIds: directRoleIds,
      roleNames: directRoleIds
        .map((id) => graph.get(id)?.name)
        .filter((name): name is string => Boolean(name)),
      isSuperAdmin,
      permissions: [...permissions].sort(),
    };
  }

  /**
   * Direct assignments. `user_roles` is the real source; `portal.roleId` is
   * unioned in as a transitional safety net for rows created before the
   * access-control migration backfilled them.
   */
  private async getDirectRoleIds(userId: number): Promise<number[]> {
    const rows: Array<{ roleId: number }> = await this.tenantConnService
      .getCurrentDataSource()
      .query(
        `SELECT DISTINCT x."roleId" FROM (
           SELECT "roleId" FROM "user_roles" WHERE "userId" = $1
           UNION
           SELECT "roleId" FROM "portal" WHERE "id" = $1 AND "roleId" IS NOT NULL
         ) x`,
        [userId],
      );
    return rows.map((r) => Number(r.roleId));
  }

  /**
   * The tenant's whole role graph in one query. Roles number in the dozens at
   * most, so loading all of them once per epoch is cheaper than walking the
   * implication chain with a query per hop.
   */
  private async getRoleGraph(
    slug: string,
    epoch: number,
  ): Promise<Map<number, RoleNode>> {
    const key = `tenant:${slug}:acl:v${epoch}:graph`;

    const cached = await this.cacheManager.get<RoleNode[]>(key);
    if (cached) return new Map(cached.map((n) => [n.id, n]));

    const rows: Array<{
      id: number;
      name: string;
      isSuperAdmin: boolean;
      permissions: string[] | null;
      implies: number[] | null;
    }> = await this.tenantConnService.getCurrentDataSource().query(`
      SELECT r."id",
             r."name",
             r."isSuperAdmin",
             COALESCE(
               array_agg(DISTINCT p."key") FILTER (WHERE p."key" IS NOT NULL),
               '{}'
             ) AS "permissions",
             COALESCE(
               array_agg(DISTINCT ri."impliedRoleId")
                 FILTER (WHERE ri."impliedRoleId" IS NOT NULL),
               '{}'
             ) AS "implies"
        FROM "roles" r
        LEFT JOIN "role_permissions" rp ON rp."roleId" = r."id"
        LEFT JOIN "permissions" p ON p."id" = rp."permissionId"
        LEFT JOIN "role_implications" ri ON ri."roleId" = r."id"
       GROUP BY r."id", r."name", r."isSuperAdmin"
    `);

    const nodes: RoleNode[] = rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      isSuperAdmin: Boolean(row.isSuperAdmin),
      permissions: row.permissions ?? [],
      implies: (row.implies ?? []).map(Number),
    }));

    await this.cacheManager.set(key, nodes, AccessControlService.GRAPH_TTL_MS);
    return new Map(nodes.map((n) => [n.id, n]));
  }
}
