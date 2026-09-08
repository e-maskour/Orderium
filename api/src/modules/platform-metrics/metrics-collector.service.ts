import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { DataSource, Repository, In } from 'typeorm';
import { Tenant } from '../tenant/tenant.entity';
import { TenantService } from '../tenant/tenant.service';
import { TenantDailyMetric } from './entities/tenant-daily-metric.entity';
import { reportingDate, monthStart } from './metrics.util';

/** Tenant statuses whose databases are not worth walking. */
const SKIPPED_STATUSES = ['archived', 'deleted'];

/**
 * How many tenant databases are read at the same time.
 *
 * Deliberately small. Each slot opens its own short-lived connection, entirely
 * separate from TenantConnectionService's 10-slot request pool, so a nightly
 * run can never starve live traffic. Raising this trades collection wall-clock
 * for database server load.
 */
const COLLECT_CONCURRENCY = 2;

interface GroupRow {
  dim: string;
  k: string | null;
  c: number;
}

/**
 * Result of reading one tenant database. Everything is optional because a
 * tenant may be mid-migration and missing tables; each section is guarded
 * independently so one missing table does not zero out the rest.
 */
export interface CollectedMetrics {
  ordersTotal: number;
  ordersByOrigin: Record<string, number>;
  ordersByStatus: Record<string, number>;
  ordersToday: number;
  ordersThisMonth: number;
  revenueTotal: number;
  revenueThisMonth: number;
  quotesTotal: number;
  quotesByStatus: Record<string, number>;
  quotesToday: number;
  invoicesTotal: number;
  invoicesUnpaid: number;
  invoicesToday: number;
  invoicedTotal: number;
  usersTotal: number;
  usersAdmin: number;
  usersClient: number;
  productsTotal: number;
  partnersCustomers: number;
  partnersSuppliers: number;
  dbSizeBytes: number;
  storageBytes: number;
}

export interface CollectionRunResult {
  date: string;
  tenantsProcessed: number;
  tenantsFailed: number;
  durationMs: number;
  failures: Array<{ tenantId: number; slug: string; error: string }>;
}

/**
 * Walks every tenant database once a night and writes one snapshot row per
 * tenant into `orderium_master`.
 *
 * The read side never touches tenant databases: it reads only master. That is
 * the entire point — cross-tenant aggregation over a database-per-tenant
 * layout is not something you can do live at request time.
 */
@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);

  /** Guards against a manual trigger overlapping the nightly cron. */
  private running = false;

  constructor(
    @InjectRepository(Tenant, 'master')
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantDailyMetric, 'master')
    private readonly metricRepo: Repository<TenantDailyMetric>,
    @InjectDataSource('master')
    private readonly masterDs: DataSource,
    private readonly tenantService: TenantService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Entry points ──────────────────────────────────────────────────────────

  /**
   * Nightly full sweep. 03:15 is after the lifecycle crons (hourly) and well
   * clear of the daily-summary notification jobs at 08:00-09:00.
   */
  @Cron('15 3 * * *', { name: 'platform-metrics-collect' })
  async collectNightly(): Promise<void> {
    if (this.running) {
      this.logger.warn('Nightly collection skipped — a run is already active');
      return;
    }
    await this.collectAll();
  }

  /**
   * Collect every eligible tenant. Safe to call manually; concurrent calls are
   * rejected rather than queued so a operator mashing the button cannot
   * multiply database load.
   */
  async collectAll(): Promise<CollectionRunResult> {
    if (this.running) {
      throw new Error('A collection run is already in progress');
    }
    this.running = true;
    const startedAt = Date.now();
    const date = this.today();

    try {
      const tenants = await this.tenantRepo.find({
        where: { status: In(this.eligibleStatuses()) },
        order: { id: 'ASC' },
      });

      const failures: CollectionRunResult['failures'] = [];
      let processed = 0;

      // Fixed-size worker pool: `COLLECT_CONCURRENCY` workers pulling off a
      // shared cursor. Keeps peak connection count bounded regardless of how
      // many tenants exist.
      let cursor = 0;
      const worker = async (): Promise<void> => {
        for (;;) {
          const index = cursor++;
          if (index >= tenants.length) return;
          const tenant = tenants[index];
          try {
            await this.collectTenant(tenant, date);
            processed++;
          } catch (err) {
            const message = (err as Error).message;
            failures.push({
              tenantId: tenant.id,
              slug: tenant.slug,
              error: message,
            });
            this.logger.error(
              `Metrics collection failed for tenant '${tenant.slug}': ${message}`,
            );
          }
        }
      };

      await Promise.all(
        Array.from({ length: COLLECT_CONCURRENCY }, () => worker()),
      );

      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `Metrics collection finished for ${date}: ${processed} ok, ${failures.length} failed, ${durationMs}ms`,
      );

      return {
        date,
        tenantsProcessed: processed,
        tenantsFailed: failures.length,
        durationMs,
        failures,
      };
    } finally {
      this.running = false;
    }
  }

  /** Collect a single tenant on demand — used by the per-tenant refresh button. */
  async collectOne(tenantId: number): Promise<TenantDailyMetric | null> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) return null;
    const date = this.today();
    await this.collectTenant(tenant, date);
    return this.metricRepo.findOne({
      where: { tenantId, metricDate: date },
    });
  }

  isRunning(): boolean {
    return this.running;
  }

  // ─── Per-tenant collection ─────────────────────────────────────────────────

  private async collectTenant(tenant: Tenant, date: string): Promise<void> {
    const startedAt = Date.now();
    let metrics: CollectedMetrics;
    let error: string | null = null;

    try {
      metrics = await this.readTenantDatabase(tenant);
    } catch (err) {
      error = (err as Error).message;
      metrics = emptyMetrics();
      // Falls through: the row is still written so the dashboard shows a gap
      // with a reason rather than silently reusing yesterday's numbers.
    }

    // Database size is read from master (pg_database_size works cross-database)
    // so it is still available even when the tenant database itself is
    // unreachable for queries.
    if (!error || metrics.dbSizeBytes === 0) {
      try {
        const rows = await this.masterDs.query<Array<{ size: string }>>(
          'SELECT pg_database_size($1) AS size',
          [tenant.databaseName],
        );
        metrics.dbSizeBytes = rows[0] ? parseInt(rows[0].size, 10) : 0;
      } catch {
        // Non-fatal — leave at 0.
      }
    }

    // Object storage is a separate system from Postgres; a MinIO outage must
    // not cost us the database metrics we already read successfully.
    try {
      metrics.storageBytes = await this.tenantService.getMinioBucketSize(
        tenant.slug,
      );
    } catch {
      // Non-fatal — leave at 0.
    }

    await this.upsertSnapshot(tenant.id, date, metrics, {
      collectedAt: new Date(),
      durationMs: Date.now() - startedAt,
      collectionError: error,
    });

    if (error) {
      throw new Error(error);
    }
  }

  /**
   * Opens a dedicated short-lived connection to the tenant database, reads
   * everything in a handful of round-trips, and closes it.
   *
   * Every table is checked for existence first: tenants can legitimately be
   * behind on migrations, and a missing table must degrade one section rather
   * than fail the whole snapshot.
   */
  private async readTenantDatabase(tenant: Tenant): Promise<CollectedMetrics> {
    const ds = new DataSource({
      type: 'postgres',
      host:
        tenant.databaseHost || this.configService.get('DB_HOST') || 'localhost',
      port:
        tenant.databasePort ||
        Number(this.configService.get('DB_PORT') ?? 5432),
      username: this.configService.get<string>('DB_USERNAME') || 'postgres',
      password: this.configService.get<string>('DB_PASSWORD') || 'postgres',
      database: tenant.databaseName,
      synchronize: false,
      logging: false,
      // One connection is enough: the reads below are sequential.
      extra: { max: 1, min: 0, connectionTimeoutMillis: 10_000 },
    });

    await ds.initialize();
    try {
      const m = emptyMetrics();
      const tables = await this.listTables(ds);
      const today = this.today();
      const from = monthStart(today);

      if (tables.has('orders')) {
        await this.readOrders(ds, m, today, from);
      }
      if (tables.has('quotes')) {
        await this.readQuotes(ds, m, today);
      }
      if (tables.has('invoices')) {
        await this.readInvoices(ds, m, today);
      }
      if (tables.has('portal')) {
        await this.readUsers(ds, m);
      }
      if (tables.has('products')) {
        m.productsTotal = await this.count(ds, 'products');
      }
      if (tables.has('partners')) {
        await this.readPartners(ds, m);
      }

      return m;
    } finally {
      await ds.destroy().catch(() => undefined);
    }
  }

  private async listTables(ds: DataSource): Promise<Set<string>> {
    const rows = await ds.query<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    return new Set(rows.map((r) => r.table_name));
  }

  private async count(ds: DataSource, table: string): Promise<number> {
    const rows = await ds.query<Array<{ c: string }>>(
      `SELECT COUNT(*)::text AS c FROM "${table}"`,
    );
    return rows[0] ? parseInt(rows[0].c, 10) : 0;
  }

  /**
   * Totals and money in one round-trip, breakdowns in a second.
   *
   * Counts use `dateCreated` (when the record was entered) rather than `date`
   * (the document date, which users can backdate). For usage monitoring and
   * the per-month order quota, entry time is the honest measure.
   */
  private async readOrders(
    ds: DataSource,
    m: CollectedMetrics,
    today: string,
    monthFrom: string,
  ): Promise<void> {
    const [totals] = await ds.query<
      Array<{
        total: string;
        today: string;
        month: string;
        revenue_total: string;
        revenue_month: string;
      }>
    >(
      `SELECT
         COUNT(*)::text                                                        AS total,
         COUNT(*) FILTER (WHERE "dateCreated"::date = $1)::text                AS today,
         COUNT(*) FILTER (WHERE "dateCreated"::date >= $2)::text               AS month,
         COALESCE(SUM(total), 0)::text                                         AS revenue_total,
         COALESCE(SUM(total) FILTER (WHERE "dateCreated"::date >= $2), 0)::text AS revenue_month
       FROM orders`,
      [today, monthFrom],
    );

    if (totals) {
      m.ordersTotal = parseInt(totals.total, 10);
      m.ordersToday = parseInt(totals.today, 10);
      m.ordersThisMonth = parseInt(totals.month, 10);
      m.revenueTotal = Number(totals.revenue_total);
      m.revenueThisMonth = Number(totals.revenue_month);
    }

    // originType is the field the operator asked about: BACKOFFICE (admin
    // back-office), ADMIN_POS, CLIENT_POS. Both breakdowns in one trip.
    const rows = await ds.query<GroupRow[]>(
      `SELECT 'origin' AS dim, COALESCE("originType", 'UNKNOWN') AS k, COUNT(*)::int AS c
         FROM orders GROUP BY 2
       UNION ALL
       SELECT 'status' AS dim, COALESCE(status::text, 'unknown') AS k, COUNT(*)::int AS c
         FROM orders GROUP BY 2`,
    );

    for (const row of rows) {
      const bucket = row.dim === 'origin' ? m.ordersByOrigin : m.ordersByStatus;
      bucket[row.k ?? 'unknown'] = Number(row.c);
    }
  }

  private async readQuotes(
    ds: DataSource,
    m: CollectedMetrics,
    today: string,
  ): Promise<void> {
    const [totals] = await ds.query<Array<{ total: string; today: string }>>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE "dateCreated"::date = $1)::text AS today
         FROM quotes`,
      [today],
    );
    if (totals) {
      m.quotesTotal = parseInt(totals.total, 10);
      m.quotesToday = parseInt(totals.today, 10);
    }

    const rows = await ds.query<Array<{ k: string | null; c: number }>>(
      `SELECT COALESCE(status::text, 'unknown') AS k, COUNT(*)::int AS c
         FROM quotes GROUP BY 1`,
    );
    for (const row of rows) {
      m.quotesByStatus[row.k ?? 'unknown'] = Number(row.c);
    }
  }

  private async readInvoices(
    ds: DataSource,
    m: CollectedMetrics,
    today: string,
  ): Promise<void> {
    const [totals] = await ds.query<
      Array<{ total: string; unpaid: string; today: string; amount: string }>
    >(
      `SELECT COUNT(*)::text                                                  AS total,
              COUNT(*) FILTER (WHERE status IN ('unpaid', 'partial'))::text   AS unpaid,
              COUNT(*) FILTER (WHERE "dateCreated"::date = $1)::text          AS today,
              COALESCE(SUM(total), 0)::text                                   AS amount
         FROM invoices`,
      [today],
    );
    if (totals) {
      m.invoicesTotal = parseInt(totals.total, 10);
      m.invoicesUnpaid = parseInt(totals.unpaid, 10);
      m.invoicesToday = parseInt(totals.today, 10);
      m.invoicedTotal = Number(totals.amount);
    }
  }

  /**
   * Users live in the `portal` table, not `users` — `userType` discriminates
   * back-office staff ('admin') from portal customers ('client'). Only staff
   * count against the tenant's seat quota.
   */
  private async readUsers(ds: DataSource, m: CollectedMetrics): Promise<void> {
    const [row] = await ds.query<
      Array<{ total: string; admins: string; clients: string }>
    >(
      `SELECT COUNT(*)::text                                            AS total,
              COUNT(*) FILTER (WHERE "userType" = 'admin')::text        AS admins,
              COUNT(*) FILTER (WHERE "userType" <> 'admin')::text       AS clients
         FROM portal`,
    );
    if (row) {
      m.usersTotal = parseInt(row.total, 10);
      m.usersAdmin = parseInt(row.admins, 10);
      m.usersClient = parseInt(row.clients, 10);
    }
  }

  private async readPartners(
    ds: DataSource,
    m: CollectedMetrics,
  ): Promise<void> {
    const [row] = await ds.query<
      Array<{ customers: string; suppliers: string }>
    >(
      `SELECT COUNT(*) FILTER (WHERE "isCustomer")::text AS customers,
              COUNT(*) FILTER (WHERE "isSupplier")::text AS suppliers
         FROM partners`,
    );
    if (row) {
      m.partnersCustomers = parseInt(row.customers, 10);
      m.partnersSuppliers = parseInt(row.suppliers, 10);
    }
  }

  // ─── Persistence ───────────────────────────────────────────────────────────

  /**
   * Upserts only the L1 columns. The usage tracker owns activeUsers/apiCalls/
   * etc. on the same row, so this must never overwrite them — hence the
   * explicit column list in the DO UPDATE clause.
   */
  private async upsertSnapshot(
    tenantId: number,
    date: string,
    m: CollectedMetrics,
    meta: {
      collectedAt: Date;
      durationMs: number;
      collectionError: string | null;
    },
  ): Promise<void> {
    await this.metricRepo
      .createQueryBuilder()
      .insert()
      .into(TenantDailyMetric)
      .values({
        tenantId,
        metricDate: date,
        ...m,
        ...meta,
      })
      .orUpdate(
        [
          'ordersTotal',
          'ordersByOrigin',
          'ordersByStatus',
          'ordersToday',
          'ordersThisMonth',
          'revenueTotal',
          'revenueThisMonth',
          'quotesTotal',
          'quotesByStatus',
          'quotesToday',
          'invoicesTotal',
          'invoicesUnpaid',
          'invoicesToday',
          'invoicedTotal',
          'usersTotal',
          'usersAdmin',
          'usersClient',
          'productsTotal',
          'partnersCustomers',
          'partnersSuppliers',
          'dbSizeBytes',
          'storageBytes',
          'collectedAt',
          'durationMs',
          'collectionError',
        ],
        ['tenantId', 'metricDate'],
      )
      .execute();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private eligibleStatuses(): string[] {
    const all = [
      'trial',
      'active',
      'expired',
      'suspended',
      'disabled',
      'archived',
      'deleted',
    ];
    return all.filter((s) => !SKIPPED_STATUSES.includes(s));
  }

  private today(): string {
    return reportingDate(
      new Date(),
      this.configService.get<string>('METRICS_TIMEZONE'),
    );
  }
}

export function emptyMetrics(): CollectedMetrics {
  return {
    ordersTotal: 0,
    ordersByOrigin: {},
    ordersByStatus: {},
    ordersToday: 0,
    ordersThisMonth: 0,
    revenueTotal: 0,
    revenueThisMonth: 0,
    quotesTotal: 0,
    quotesByStatus: {},
    quotesToday: 0,
    invoicesTotal: 0,
    invoicesUnpaid: 0,
    invoicesToday: 0,
    invoicedTotal: 0,
    usersTotal: 0,
    usersAdmin: 0,
    usersClient: 0,
    productsTotal: 0,
    partnersCustomers: 0,
    partnersSuppliers: 0,
    dbSizeBytes: 0,
    storageBytes: 0,
  };
}
