import {
  Injectable,
  OnModuleDestroy,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DataSource,
  DataSourceOptions,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { tenantStorage } from './tenant.context';

/**
 * Manages a pool of per-tenant TypeORM DataSource instances.
 *
 * Design goals:
 *  - Lazy initialisation: connections are created on first request for each tenant.
 *  - Caching: once opened a connection is reused for subsequent requests.
 *  - Idle eviction: connections unused for IDLE_TIMEOUT_MS are automatically closed
 *    to reclaim database server resources (max 10 idle connections by default).
 *  - Graceful shutdown: all connections are cleanly destroyed on module teardown.
 *
 * Usage inside a service:
 *   const repo  = tenantConnService.getRepository(Order);
 *   const ds    = tenantConnService.getCurrentDataSource();
 *   const slug  = tenantConnService.getCurrentTenantSlug();
 */
@Injectable()
export class TenantConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionService.name);

  /** Active DataSource per tenant slug */
  private readonly connections = new Map<string, DataSource>();

  /** Idle-eviction timers per tenant slug */
  private readonly idleTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  /** Close inactive connection after 60 s */
  private static readonly IDLE_TIMEOUT_MS = 60_000;

  /** Maximum number of simultaneously open tenant connections */
  private static readonly MAX_OPEN_CONNECTIONS = 15;

  constructor(private readonly configService: ConfigService) { }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns (and if necessary creates) the DataSource for `tenantSlug`.
   * Called by TenantMiddleware to pre-warm the connection before route execution.
   */
  async getConnection(tenantSlug: string): Promise<DataSource> {
    const existing = this.connections.get(tenantSlug);
    if (existing?.isInitialized) {
      this.resetIdleTimer(tenantSlug);
      return existing;
    }
    return this.initConnection(tenantSlug);
  }

  /**
   * Returns the DataSource for the tenant that owns the current async context.
   * Throws if called outside a request that has been processed by TenantMiddleware.
   */
  getCurrentDataSource(): DataSource {
    const ctx = tenantStorage.getStore();
    if (!ctx) {
      throw new InternalServerErrorException(
        'TenantConnectionService.getCurrentDataSource() called outside a tenant context. ' +
        'Make sure TenantMiddleware is applied to this route.',
      );
    }
    const ds = this.connections.get(ctx.tenantSlug);
    if (!ds?.isInitialized) {
      throw new InternalServerErrorException(
        `Tenant connection for '${ctx.tenantSlug}' is not initialised. ` +
        'This should not happen — TenantMiddleware calls getConnection() before route execution.',
      );
    }
    return ds;
  }

  /**
   * Convenience wrapper — returns the TypeORM Repository for `entity`
   * bound to the current tenant's DataSource.
   */
  getRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Repository<T> {
    return this.getCurrentDataSource().getRepository(entity);
  }

  /** Returns the slug of the tenant associated with the current async context. */
  getCurrentTenantSlug(): string {
    const ctx = tenantStorage.getStore();
    if (!ctx) {
      throw new InternalServerErrorException('No active tenant context.');
    }
    return ctx.tenantSlug;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async onModuleDestroy(): Promise<void> {
    for (const slug of [...this.connections.keys()]) {
      await this.closeConnection(slug);
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async initConnection(tenantSlug: string): Promise<DataSource> {
    // Evict least-recently-used connection if at capacity
    if (this.connections.size >= TenantConnectionService.MAX_OPEN_CONNECTIONS) {
      await this.evictOldestConnection();
    }

    const options = this.buildDataSourceOptions(tenantSlug);
    const ds = new DataSource(options);

    try {
      await ds.initialize();
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to connect to database for tenant '${tenantSlug}': ${(err as Error).message}`,
      );
    }

    this.connections.set(tenantSlug, ds);
    this.resetIdleTimer(tenantSlug);
    this.logger.log(
      `Tenant connection established: ${tenantSlug} → ${String(options.database)}`,
    );

    return ds;
  }

  private buildDataSourceOptions(tenantSlug: string): DataSourceOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST') || 'localhost',
      port: Number(this.configService.get('DB_PORT') ?? 5432),
      username: this.configService.get<string>('DB_USERNAME') || 'postgres',
      password: this.configService.get<string>('DB_PASSWORD') || 'postgres',
      database: `orderium_${tenantSlug}`,
      // Load all business entities — the Tenant entity is harmless here since
      // synchronize is off and we never query it via tenant connections.
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
      synchronize: false,
      logging: this.configService.get<string>('DB_LOGGING') === 'true',
      extra: {
        // pg pool settings — keep low for VPS environments
        max: 5,
        min: 1,
        idleTimeoutMillis: TenantConnectionService.IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: 5_000,
      },
    };
  }

  private resetIdleTimer(tenantSlug: string): void {
    const existing = this.idleTimers.get(tenantSlug);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(
      () => void this.closeConnection(tenantSlug),
      TenantConnectionService.IDLE_TIMEOUT_MS,
    );
    // Allow Node to exit even if idle timers are pending
    if (typeof timer.unref === 'function') timer.unref();
    this.idleTimers.set(tenantSlug, timer);
  }

  private async evictOldestConnection(): Promise<void> {
    const [oldestSlug] = this.connections.keys();
    if (oldestSlug) await this.closeConnection(oldestSlug);
  }

  async closeConnection(tenantSlug: string): Promise<void> {
    const timer = this.idleTimers.get(tenantSlug);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(tenantSlug);
    }

    const ds = this.connections.get(tenantSlug);
    if (ds?.isInitialized) {
      await ds.destroy();
      this.logger.debug(`Tenant connection closed: ${tenantSlug}`);
    }
    this.connections.delete(tenantSlug);
  }
}
