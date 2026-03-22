import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { TenantConnectionService } from '../../modules/tenant/tenant-connection.service';

/**
 * Base class for all tenant-aware services.
 *
 * Instead of injecting TypeORM repositories via `@InjectRepository()` (which
 * are bound to a single fixed connection), subclasses call `this.repo(Entity)`
 * and `this.ds()` at query-time. These delegate to TenantConnectionService,
 * which reads the current tenant from AsyncLocalStorage and returns the
 * correct per-tenant DataSource — all without REQUEST-scoped providers.
 *
 * ─── Migration guide ──────────────────────────────────────────────────────
 *
 * BEFORE (single-tenant):
 *   @Injectable()
 *   export class OrdersService {
 *     constructor(
 *       @InjectRepository(Order) private orderRepo: Repository<Order>,
 *       private readonly dataSource: DataSource,
 *     ) {}
 *
 *     async findAll() {
 *       return this.orderRepo.find();
 *     }
 *   }
 *
 * AFTER (multi-tenant, extends TenantAwareService):
 *   @Injectable()
 *   export class OrdersService extends TenantAwareService {
 *     constructor(tenantConnService: TenantConnectionService) {
 *       super(tenantConnService);
 *     }
 *
 *     async findAll() {
 *       return this.repo(Order).find();
 *     }
 *   }
 *
 * ─── Redis cache key isolation ────────────────────────────────────────────
 *
 * Use `this.tenantCacheKey('some-key')` to automatically prefix cache keys
 * with the tenant slug, ensuring complete isolation between tenants.
 *
 * Example: `this.tenantCacheKey('products:list')` → `tenant:acme:products:list`
 */
@Injectable()
export abstract class TenantAwareService {
  constructor(protected readonly tenantConnService: TenantConnectionService) {}

  /**
   * Returns the current tenant's DataSource.
   * Throws if called outside a request context (i.e. no AsyncLocalStorage store).
   */
  protected ds(): DataSource {
    return this.tenantConnService.getCurrentDataSource();
  }

  /**
   * Returns a TypeORM Repository for `entity` bound to the current tenant DB.
   *
   * @example
   *   const order = await this.repo(Order).findOneOrFail({ where: { id } });
   */
  protected repo<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Repository<T> {
    return this.tenantConnService.getRepository(entity);
  }

  /** Returns the Entity Manager for the current tenant's DataSource. */
  protected manager(): EntityManager {
    return this.ds().manager;
  }

  /**
   * The slug of the tenant associated with the current request.
   * Useful for constructing tenant-specific paths, bucket names, log messages, etc.
   */
  protected get tenantSlug(): string {
    return this.tenantConnService.getCurrentTenantSlug();
  }

  /**
   * Builds a Redis cache key namespaced to the current tenant.
   * Always use this (or the helpers below) when interacting with the cache —
   * never use bare keys that could bleed data between tenants.
   *
   * Format: `tenant:{slug}:{key}`
   *
   * @example
   *   const key = this.tenantCacheKey('products:list');
   *   // → "tenant:acme:products:list"
   */
  protected tenantCacheKey(key: string): string {
    return `tenant:${this.tenantSlug}:${key}`;
  }
}
