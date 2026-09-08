import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/tenant.entity';
import { TenantDailyMetric } from './entities/tenant-daily-metric.entity';
import { TenantHealthBucket } from './entities/tenant-health-bucket.entity';
import {
  TenantMetricsListDto,
  SeriesQueryDto,
  HealthQueryDto,
  MetricsRangeDto,
} from './dto/metrics-query.dto';
import {
  PlatformOverview,
  PlatformAlert,
  PlatformTotals,
  PlatformTrendPoint,
  TenantMetricRow,
  TenantQuotaUsage,
  QuotaLine,
  TenantHealthSummary,
  PlatformHealth,
  HealthBucketPoint,
  TenantSeries,
  SeriesPoint,
} from './dto/metrics-response.dto';
import {
  reportingDate,
  shiftDate,
  formatBytes,
  pctChange,
  dateRange,
} from './metrics.util';

/** Metric columns a caller may request in a time series. */
const SERIES_COLUMNS = new Set([
  'ordersTotal',
  'ordersToday',
  'ordersThisMonth',
  'quotesTotal',
  'quotesToday',
  'invoicesTotal',
  'invoicesToday',
  'invoicesUnpaid',
  'revenueTotal',
  'revenueThisMonth',
  'invoicedTotal',
  'usersTotal',
  'usersAdmin',
  'usersClient',
  'productsTotal',
  'partnersCustomers',
  'partnersSuppliers',
  'dbSizeBytes',
  'storageBytes',
  'activeUsers',
  'loginCount',
  'apiCalls',
]);

const DEFAULT_SERIES = [
  'ordersToday',
  'activeUsers',
  'apiCalls',
  'usersTotal',
  'productsTotal',
];

/** Sort keys that live on the tenants table rather than the metrics row. */
const TENANT_SORT_KEYS = new Set(['name']);

/** A tenant with no activity for this many days is considered dormant. */
const DORMANT_DAYS = 14;

/** Quota usage at or above this share is surfaced as an upsell signal. */
const QUOTA_WARN_PCT = 80;

interface LatestRow extends Record<string, unknown> {
  tenantId: number;
  name: string;
  slug: string;
  status: string;
  subscriptionPlan: string;
  maxUsers: number;
  maxProducts: number;
  maxOrdersPerMonth: number;
  maxStorageMb: number;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  metricDate: string | null;
  collectedAt: Date | null;
  collectionError: string | null;
  orders30d: string | null;
}

/**
 * Read side of platform metrics.
 *
 * Reads only `orderium_master`. It never opens a tenant database — that is what
 * makes cross-tenant reporting fast over a database-per-tenant layout.
 */
@Injectable()
export class PlatformMetricsService {
  constructor(
    @InjectRepository(Tenant, 'master')
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantDailyMetric, 'master')
    private readonly dailyRepo: Repository<TenantDailyMetric>,
    @InjectRepository(TenantHealthBucket, 'master')
    private readonly healthRepo: Repository<TenantHealthBucket>,
    private readonly configService: ConfigService,
  ) {}

  // ─── Overview ──────────────────────────────────────────────────────────────

  async getOverview(range: MetricsRangeDto): Promise<PlatformOverview> {
    const to = range.to ?? this.today();
    const from = range.from ?? shiftDate(to, -29);

    const rows = await this.getTenantRows({ to });
    const trend = await this.getTrend(from, to);
    const previous = await this.getPreviousTotals(from, to);

    const totals = this.sumTotals(rows);
    const alerts = this.buildAlerts(rows);

    const collectedTimes = rows
      .map((r) => r.collectedAt)
      .filter((v): v is string => Boolean(v))
      .sort();

    const staleCutoff = shiftDate(to, -1);
    const staleTenants = rows.filter(
      (r) => !r.metricDate || r.metricDate < staleCutoff,
    ).length;

    return {
      date: to,
      lastCollectedAt: collectedTimes.length
        ? collectedTimes[collectedTimes.length - 1]
        : null,
      staleTenants,
      totals,
      deltas: {
        orders: pctChange(totals.orders, previous.orders),
        users: pctChange(totals.users, previous.users),
        revenue: pctChange(totals.revenue, previous.revenue),
        activeUsers: pctChange(totals.activeUsers, previous.activeUsers),
      },
      trend,
      alerts,
    };
  }

  private sumTotals(rows: TenantMetricRow[]): PlatformTotals {
    const totals: PlatformTotals = {
      tenants: rows.length,
      activeTenants: rows.filter((r) => r.status === 'active').length,
      trialTenants: rows.filter((r) => r.status === 'trial').length,
      orders: 0,
      ordersByOrigin: {},
      ordersThisMonth: 0,
      users: 0,
      products: 0,
      quotes: 0,
      invoices: 0,
      revenue: 0,
      dbSizeBytes: 0,
      storageBytes: 0,
      activeUsers: 0,
      apiCalls: 0,
    };

    for (const r of rows) {
      totals.orders += r.ordersTotal;
      totals.ordersThisMonth += r.ordersThisMonth;
      totals.users += r.usersTotal;
      totals.products += r.productsTotal;
      totals.quotes += r.quotesTotal;
      totals.invoices += r.invoicesTotal;
      totals.revenue += r.revenueTotal;
      totals.dbSizeBytes += r.dbSizeBytes;
      totals.storageBytes += r.storageBytes;
      totals.activeUsers += r.activeUsers;
      totals.apiCalls += r.apiCalls;
      for (const [origin, count] of Object.entries(r.ordersByOrigin ?? {})) {
        totals.ordersByOrigin[origin] =
          (totals.ordersByOrigin[origin] ?? 0) + Number(count);
      }
    }
    return totals;
  }

  /**
   * Totals as of the day before `from`, so the overview can show change over
   * the selected window rather than an unanchored absolute number.
   */
  private async getPreviousTotals(
    from: string,
    to: string,
  ): Promise<{
    orders: number;
    users: number;
    revenue: number;
    activeUsers: number;
  }> {
    const windowDays = dateRange(from, to).length;
    const priorTo = shiftDate(from, -1);
    const priorFrom = shiftDate(priorTo, -(windowDays - 1));

    const [row] = await this.dailyRepo.query<
      Array<{
        orders: string;
        users: string;
        revenue: string;
        active_users: string;
      }>
    >(
      `WITH latest AS (
         SELECT DISTINCT ON ("tenantId") *
           FROM tenant_daily_metrics
          WHERE "metricDate" <= $1
          ORDER BY "tenantId", "metricDate" DESC
       )
       SELECT COALESCE(SUM("ordersTotal"), 0)::text  AS orders,
              COALESCE(SUM("usersTotal"), 0)::text   AS users,
              COALESCE(SUM("revenueTotal"), 0)::text AS revenue,
              (SELECT COALESCE(SUM("activeUsers"), 0)::text
                 FROM tenant_daily_metrics
                WHERE "metricDate" BETWEEN $2 AND $1) AS active_users
         FROM latest`,
      [priorTo, priorFrom],
    );

    return {
      orders: Number(row?.orders ?? 0),
      users: Number(row?.users ?? 0),
      revenue: Number(row?.revenue ?? 0),
      activeUsers: Number(row?.active_users ?? 0),
    };
  }

  /** Platform-wide daily trend: one point per day, summed across all tenants. */
  private async getTrend(
    from: string,
    to: string,
  ): Promise<PlatformTrendPoint[]> {
    const rows = await this.dailyRepo.query<
      Array<{
        d: string;
        orders: string;
        quotes: string;
        invoices: string;
        active_users: string;
        api_calls: string;
      }>
    >(
      `SELECT "metricDate"::text                     AS d,
              COALESCE(SUM("ordersToday"), 0)::text   AS orders,
              COALESCE(SUM("quotesToday"), 0)::text   AS quotes,
              COALESCE(SUM("invoicesToday"), 0)::text AS invoices,
              COALESCE(SUM("activeUsers"), 0)::text   AS active_users,
              COALESCE(SUM("apiCalls"), 0)::text      AS api_calls
         FROM tenant_daily_metrics
        WHERE "metricDate" BETWEEN $1 AND $2
        GROUP BY 1
        ORDER BY 1`,
      [from, to],
    );

    const errorsByDay = await this.getDailyErrorCounts(from, to);
    const byDate = new Map(rows.map((r) => [r.d, r]));

    // Emit a point for every day in the range, including days with no data, so
    // the chart shows a gap rather than silently compressing the x-axis.
    return dateRange(from, to).map((date) => {
      const r = byDate.get(date);
      return {
        date,
        orders: Number(r?.orders ?? 0),
        quotes: Number(r?.quotes ?? 0),
        invoices: Number(r?.invoices ?? 0),
        activeUsers: Number(r?.active_users ?? 0),
        apiCalls: Number(r?.api_calls ?? 0),
        errors: errorsByDay.get(date) ?? 0,
      };
    });
  }

  private async getDailyErrorCounts(
    from: string,
    to: string,
  ): Promise<Map<string, number>> {
    const rows = await this.healthRepo.query<
      Array<{ d: string; errors: string }>
    >(
      `SELECT ("bucketStart" AT TIME ZONE 'UTC')::date::text AS d,
              COALESCE(SUM("errors5xx"), 0)::text            AS errors
         FROM tenant_health_buckets
        WHERE ("bucketStart" AT TIME ZONE 'UTC')::date BETWEEN $1 AND $2
        GROUP BY 1`,
      [from, to],
    );
    return new Map(rows.map((r) => [r.d, Number(r.errors)]));
  }

  // ─── Per-tenant table ──────────────────────────────────────────────────────

  async listTenantMetrics(
    query: TenantMetricsListDto,
  ): Promise<TenantMetricRow[]> {
    const to = query.to ?? this.today();

    const rows = await this.getTenantRows({
      to,
      search: query.search,
      status: query.status,
    });

    return this.sortRows(rows, query.sortBy, query.sortOrder);
  }

  private sortRows(
    rows: TenantMetricRow[],
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): TenantMetricRow[] {
    if (!sortBy) return rows;
    const dir = sortOrder === 'ASC' ? 1 : -1;

    return [...rows].sort((a, b) => {
      if (TENANT_SORT_KEYS.has(sortBy)) {
        return dir * String(a.name).localeCompare(String(b.name));
      }
      if (sortBy === 'lastActivityAt') {
        // Nulls always last, whichever direction is requested — a tenant that
        // has never been active is not "the most recently active".
        const av = a.lastActivityAt;
        const bv = b.lastActivityAt;
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return dir * (av < bv ? -1 : av > bv ? 1 : 0);
      }
      const av = Number(a[sortBy as keyof TenantMetricRow] ?? 0);
      const bv = Number(b[sortBy as keyof TenantMetricRow] ?? 0);
      return dir * (av - bv);
    });
  }

  /**
   * The core projection: every tenant joined to its most recent snapshot, plus
   * a 30-day order rollup, quota usage, health, and a churn-risk score.
   *
   * A tenant with no snapshot at all still appears, with zeroed metrics and a
   * `stale-metrics` alert — an invisible tenant is worse than a blank row.
   */
  private async getTenantRows(opts: {
    to: string;
    search?: string;
    status?: string;
    tenantId?: number;
  }): Promise<TenantMetricRow[]> {
    const params: unknown[] = [opts.to, shiftDate(opts.to, -29)];
    const conditions: string[] = [];

    if (opts.search) {
      params.push(`%${opts.search}%`);
      conditions.push(
        `(t.name ILIKE $${params.length} OR t.slug ILIKE $${params.length})`,
      );
    }
    if (opts.status && opts.status !== 'all') {
      params.push(opts.status);
      conditions.push(`t.status = $${params.length}`);
    } else {
      conditions.push(`t.status NOT IN ('deleted')`);
    }
    if (opts.tenantId) {
      params.push(opts.tenantId);
      conditions.push(`t.id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.dailyRepo.query<LatestRow[]>(
      `WITH latest AS (
         SELECT DISTINCT ON ("tenantId") *
           FROM tenant_daily_metrics
          WHERE "metricDate" <= $1
          ORDER BY "tenantId", "metricDate" DESC
       ),
       last30 AS (
         SELECT "tenantId", COALESCE(SUM("ordersToday"), 0) AS orders_30d
           FROM tenant_daily_metrics
          WHERE "metricDate" BETWEEN $2 AND $1
          GROUP BY "tenantId"
       )
       SELECT t.id                    AS "tenantId",
              t.name                  AS name,
              t.slug                  AS slug,
              t.status                AS status,
              t."subscriptionPlan"    AS "subscriptionPlan",
              t."maxUsers"            AS "maxUsers",
              t."maxProducts"         AS "maxProducts",
              t."maxOrdersPerMonth"   AS "maxOrdersPerMonth",
              t."maxStorageMb"        AS "maxStorageMb",
              t."trialEndsAt"         AS "trialEndsAt",
              t."subscriptionEndsAt"  AS "subscriptionEndsAt",
              l."metricDate"::text    AS "metricDate",
              l."collectedAt"         AS "collectedAt",
              l."collectionError"     AS "collectionError",
              l."ordersTotal", l."ordersByOrigin", l."ordersThisMonth",
              l."quotesTotal", l."invoicesTotal", l."invoicesUnpaid",
              l."productsTotal", l."usersTotal", l."usersAdmin",
              l."partnersCustomers", l."partnersSuppliers",
              l."revenueTotal", l."activeUsers", l."apiCalls",
              l."lastActivityAt", l."dbSizeBytes", l."storageBytes",
              d.orders_30d            AS "orders30d"
         FROM tenants t
         LEFT JOIN latest l ON l."tenantId" = t.id
         LEFT JOIN last30 d ON d."tenantId" = t.id
         ${where}
         ORDER BY t.name ASC`,
      params,
    );

    const health = await this.getHealthByTenant(24);
    const now = Date.now();

    return rows.map((r) => this.toMetricRow(r, health, now));
  }

  private toMetricRow(
    r: LatestRow,
    health: Map<number, TenantHealthSummary>,
    now: number,
  ): TenantMetricRow {
    const num = (key: string): number => Number(r[key] ?? 0);
    const json = (key: string): Record<string, number> =>
      (r[key] as Record<string, number> | null) ?? {};

    const lastActivity = r.lastActivityAt as Date | null;
    const lastActivityAt = lastActivity
      ? new Date(lastActivity).toISOString()
      : null;
    const daysSinceActivity = lastActivity
      ? Math.floor((now - new Date(lastActivity).getTime()) / 86_400_000)
      : null;

    const dbSizeBytes = num('dbSizeBytes');
    const storageBytes = num('storageBytes');

    const quota = this.buildQuota(r, num, storageBytes);
    const { score, reasons } = this.scoreRisk(r, daysSinceActivity, num);

    return {
      tenantId: r.tenantId,
      name: r.name,
      slug: r.slug,
      status: r.status,
      subscriptionPlan: r.subscriptionPlan,
      metricDate: r.metricDate,
      collectedAt: r.collectedAt ? new Date(r.collectedAt).toISOString() : null,
      collectionError: r.collectionError,

      ordersTotal: num('ordersTotal'),
      ordersByOrigin: json('ordersByOrigin'),
      ordersThisMonth: num('ordersThisMonth'),
      orders30d: Number(r.orders30d ?? 0),
      quotesTotal: num('quotesTotal'),
      invoicesTotal: num('invoicesTotal'),
      invoicesUnpaid: num('invoicesUnpaid'),
      productsTotal: num('productsTotal'),
      usersTotal: num('usersTotal'),
      usersAdmin: num('usersAdmin'),
      partnersCustomers: num('partnersCustomers'),
      partnersSuppliers: num('partnersSuppliers'),
      revenueTotal: num('revenueTotal'),

      activeUsers: num('activeUsers'),
      apiCalls: num('apiCalls'),
      lastActivityAt,
      daysSinceActivity,

      dbSizeBytes,
      dbSizeHuman: formatBytes(dbSizeBytes),
      storageBytes,
      storageHuman: formatBytes(storageBytes),

      quota,
      health: health.get(r.tenantId) ?? null,
      riskScore: score,
      riskReasons: reasons,
    };
  }

  private buildQuota(
    r: LatestRow,
    num: (key: string) => number,
    storageBytes: number,
  ): TenantQuotaUsage {
    // Only back-office staff consume seats; portal customers are unlimited.
    const users = quotaLine(num('usersAdmin'), r.maxUsers);
    const products = quotaLine(num('productsTotal'), r.maxProducts);
    const ordersPerMonth = quotaLine(
      num('ordersThisMonth'),
      r.maxOrdersPerMonth,
    );
    const storageMb = quotaLine(
      Math.round(storageBytes / (1024 * 1024)),
      r.maxStorageMb,
    );

    const pcts = [users, products, ordersPerMonth, storageMb]
      .map((l) => l.pct)
      .filter((p): p is number => p !== null);

    return {
      users,
      products,
      ordersPerMonth,
      storageMb,
      worstPct: pcts.length ? Math.max(...pcts) : null,
    };
  }

  /**
   * Churn-risk heuristic, 0-100.
   *
   * Deliberately transparent rather than clever: every contribution comes with
   * a human-readable reason, so an operator can judge the score instead of
   * trusting it.
   */
  private scoreRisk(
    r: LatestRow,
    daysSinceActivity: number | null,
    num: (key: string) => number,
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (daysSinceActivity === null) {
      score += 35;
      reasons.push('No recorded activity yet');
    } else if (daysSinceActivity >= DORMANT_DAYS) {
      score += 40;
      reasons.push(`Dormant for ${daysSinceActivity} days`);
    } else if (daysSinceActivity >= 7) {
      score += 20;
      reasons.push(`No activity for ${daysSinceActivity} days`);
    }

    if (Number(r.orders30d ?? 0) === 0 && num('ordersTotal') > 0) {
      score += 25;
      reasons.push('No orders in the last 30 days');
    }

    if (r.status === 'expired' || r.status === 'suspended') {
      score += 30;
      reasons.push(`Status is ${r.status}`);
    }

    const endsAt = r.trialEndsAt ?? r.subscriptionEndsAt;
    if (endsAt) {
      const daysLeft = Math.ceil(
        (new Date(endsAt).getTime() - Date.now()) / 86_400_000,
      );
      if (daysLeft >= 0 && daysLeft <= 7) {
        score += 20;
        reasons.push(
          `${r.status === 'trial' ? 'Trial' : 'Subscription'} ends in ${daysLeft} day(s)`,
        );
      }
    }

    if (num('usersTotal') === 0) {
      score += 15;
      reasons.push('No users created');
    }

    return { score: Math.min(100, score), reasons };
  }

  // ─── Alerts ────────────────────────────────────────────────────────────────

  private buildAlerts(rows: TenantMetricRow[]): PlatformAlert[] {
    const alerts: PlatformAlert[] = [];

    for (const r of rows) {
      const base = { tenantId: r.tenantId, tenantName: r.name };

      if (r.collectionError) {
        alerts.push({
          ...base,
          id: `collection-${r.tenantId}`,
          severity: 'critical',
          kind: 'collection-failed',
          message: `Metrics collection failed: ${r.collectionError}`,
        });
      } else if (!r.metricDate) {
        alerts.push({
          ...base,
          id: `stale-${r.tenantId}`,
          severity: 'warning',
          kind: 'stale-metrics',
          message: 'No metrics collected yet for this tenant',
        });
      }

      const q = r.quota;
      const exceeded = (
        [
          ['users', q.users, 'user seats'],
          ['products', q.products, 'products'],
          ['ordersPerMonth', q.ordersPerMonth, 'orders this month'],
          ['storageMb', q.storageMb, 'storage'],
        ] as const
      ).filter(([, line]) => line.exceeded);

      for (const [key, line, label] of exceeded) {
        alerts.push({
          ...base,
          id: `quota-${key}-${r.tenantId}`,
          severity: 'critical',
          kind: 'quota-exceeded',
          message: `Over plan limit on ${label}: ${line.used} of ${line.limit}`,
          value: line.pct ?? undefined,
        });
      }

      if (
        !exceeded.length &&
        q.worstPct !== null &&
        q.worstPct >= QUOTA_WARN_PCT
      ) {
        alerts.push({
          ...base,
          id: `quota-near-${r.tenantId}`,
          severity: 'warning',
          kind: 'quota-near',
          message: `At ${Math.round(q.worstPct)}% of a plan limit — upsell candidate`,
          value: q.worstPct,
        });
      }

      if (
        r.daysSinceActivity !== null &&
        r.daysSinceActivity >= DORMANT_DAYS &&
        r.status !== 'archived'
      ) {
        alerts.push({
          ...base,
          id: `dormant-${r.tenantId}`,
          severity: 'warning',
          kind: 'dormant',
          message: `No activity for ${r.daysSinceActivity} days`,
          value: r.daysSinceActivity,
        });
      }

      if (r.health && r.health.requests > 20 && r.health.errorRate >= 5) {
        alerts.push({
          ...base,
          id: `errors-${r.tenantId}`,
          severity: r.health.errorRate >= 15 ? 'critical' : 'warning',
          kind: 'error-rate',
          message: `${r.health.errorRate.toFixed(1)}% of requests failing in the last 24h`,
          value: r.health.errorRate,
        });
      }
    }

    const rank = { critical: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }

  // ─── Time series ───────────────────────────────────────────────────────────

  async getTenantSeries(
    tenantId: number,
    query: SeriesQueryDto,
  ): Promise<TenantSeries> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const to = query.to ?? this.today();
    const from = query.from ?? shiftDate(to, -29);

    // Whitelist rather than interpolate: these names go straight into SQL.
    const requested = (query.metrics ?? '')
      .split(',')
      .map((m) => m.trim())
      .filter((m) => SERIES_COLUMNS.has(m));
    const metrics = requested.length ? requested : DEFAULT_SERIES;

    const selects = metrics
      .map((m) => `COALESCE("${m}", 0) AS "${m}"`)
      .join(', ');
    const rows = await this.dailyRepo.query<Array<Record<string, unknown>>>(
      `SELECT "metricDate"::text AS date, ${selects}
         FROM tenant_daily_metrics
        WHERE "tenantId" = $1 AND "metricDate" BETWEEN $2 AND $3
        ORDER BY "metricDate"`,
      [tenantId, from, to],
    );

    const byDate = new Map(rows.map((r) => [String(r.date), r]));
    const points: SeriesPoint[] = dateRange(from, to).map((date) => {
      const row = byDate.get(date);
      const point: SeriesPoint = { date };
      for (const m of metrics) {
        point[m] = row ? Number(row[m] ?? 0) : 0;
      }
      return point;
    });

    return { tenantId, from, to, metrics, points };
  }

  async getTenantDetail(tenantId: number): Promise<TenantMetricRow> {
    const to = this.today();
    const rows = await this.getTenantRows({
      to,
      tenantId,
      status: 'all',
    });
    if (!rows.length) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
    return rows[0];
  }

  // ─── Health ────────────────────────────────────────────────────────────────

  async getHealth(query: HealthQueryDto): Promise<PlatformHealth> {
    const hours = query.hours ?? 24;
    const since = new Date(Date.now() - hours * 3600_000);

    const params: unknown[] = [since];
    let tenantFilter = '';
    if (query.tenantId) {
      params.push(query.tenantId);
      tenantFilter = ` AND "tenantId" = $${params.length}`;
    }

    const [totalsRow] = await this.healthRepo.query<
      Array<Record<string, string>>
    >(
      `SELECT COALESCE(SUM(requests), 0)::text       AS requests,
              COALESCE(SUM("errors4xx"), 0)::text    AS errors4xx,
              COALESCE(SUM("errors5xx"), 0)::text    AS errors5xx,
              COALESCE(SUM("slowRequests"), 0)::text AS slow,
              COALESCE(SUM("latencySumMs"), 0)::text AS sum_ms,
              COALESCE(MAX("latencyMaxMs"), 0)::text AS max_ms,
              COALESCE(MAX("latencyP95Ms"), 0)::text AS p95_ms
         FROM tenant_health_buckets
        WHERE "bucketStart" >= $1${tenantFilter}`,
      params,
    );

    const series = await this.healthRepo.query<Array<Record<string, string>>>(
      `SELECT "bucketStart"                          AS bucket,
              COALESCE(SUM(requests), 0)::text       AS requests,
              COALESCE(SUM("errors4xx"), 0)::text    AS errors4xx,
              COALESCE(SUM("errors5xx"), 0)::text    AS errors5xx,
              COALESCE(MAX("latencyP95Ms"), 0)::text AS p95_ms
         FROM tenant_health_buckets
        WHERE "bucketStart" >= $1${tenantFilter}
        GROUP BY "bucketStart"
        ORDER BY "bucketStart"`,
      params,
    );

    const worst = await this.healthRepo.query<Array<Record<string, string>>>(
      `SELECT h."tenantId"                             AS "tenantId",
              t.name                                   AS name,
              t.slug                                   AS slug,
              COALESCE(SUM(h.requests), 0)::text       AS requests,
              COALESCE(SUM(h."errors4xx"), 0)::text    AS errors4xx,
              COALESCE(SUM(h."errors5xx"), 0)::text    AS errors5xx,
              COALESCE(SUM(h."slowRequests"), 0)::text AS slow,
              COALESCE(SUM(h."latencySumMs"), 0)::text AS sum_ms,
              COALESCE(MAX(h."latencyMaxMs"), 0)::text AS max_ms,
              COALESCE(MAX(h."latencyP95Ms"), 0)::text AS p95_ms
         FROM tenant_health_buckets h
         JOIN tenants t ON t.id = h."tenantId"
        WHERE h."bucketStart" >= $1${tenantFilter}
        GROUP BY h."tenantId", t.name, t.slug
       HAVING SUM(h.requests) > 0
        ORDER BY (SUM(h."errors5xx")::float / GREATEST(SUM(h.requests), 1)) DESC,
                 SUM(h."errors5xx") DESC
        LIMIT 10`,
      params,
    );

    return {
      windowHours: hours,
      totals: summariseHealth(0, totalsRow ?? {}),
      series: series.map(
        (r): HealthBucketPoint => ({
          bucketStart: new Date(r.bucket).toISOString(),
          requests: Number(r.requests),
          errors4xx: Number(r.errors4xx),
          errors5xx: Number(r.errors5xx),
          p95LatencyMs: Number(r.p95_ms),
        }),
      ),
      worstTenants: worst.map((r) => ({
        ...summariseHealth(Number(r.tenantId), r),
        name: r.name,
        slug: r.slug,
      })),
    };
  }

  /** Per-tenant health over the last `hours`, keyed by tenant id. */
  private async getHealthByTenant(
    hours: number,
  ): Promise<Map<number, TenantHealthSummary>> {
    const since = new Date(Date.now() - hours * 3600_000);
    const rows = await this.healthRepo.query<Array<Record<string, string>>>(
      `SELECT "tenantId"                             AS "tenantId",
              COALESCE(SUM(requests), 0)::text       AS requests,
              COALESCE(SUM("errors4xx"), 0)::text    AS errors4xx,
              COALESCE(SUM("errors5xx"), 0)::text    AS errors5xx,
              COALESCE(SUM("slowRequests"), 0)::text AS slow,
              COALESCE(SUM("latencySumMs"), 0)::text AS sum_ms,
              COALESCE(MAX("latencyMaxMs"), 0)::text AS max_ms,
              COALESCE(MAX("latencyP95Ms"), 0)::text AS p95_ms
         FROM tenant_health_buckets
        WHERE "bucketStart" >= $1
        GROUP BY "tenantId"`,
      [since],
    );

    return new Map(
      rows.map((r) => [
        Number(r.tenantId),
        summariseHealth(Number(r.tenantId), r),
      ]),
    );
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  /**
   * CSV of the tenant table, for the spreadsheet work an operator inevitably
   * wants to do anyway.
   */
  async exportCsv(query: TenantMetricsListDto): Promise<string> {
    const rows = await this.listTenantMetrics(query);

    const headers = [
      'tenant_id',
      'name',
      'slug',
      'status',
      'plan',
      'snapshot_date',
      'orders_total',
      'orders_backoffice',
      'orders_admin_pos',
      'orders_client_pos',
      'orders_this_month',
      'orders_30d',
      'quotes_total',
      'invoices_total',
      'invoices_unpaid',
      'products_total',
      'users_total',
      'users_admin',
      'customers',
      'suppliers',
      'revenue_total',
      'active_users',
      'api_calls',
      'last_activity_at',
      'days_since_activity',
      'db_size_bytes',
      'storage_bytes',
      'quota_worst_pct',
      'risk_score',
    ];

    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.tenantId,
          csvCell(r.name),
          csvCell(r.slug),
          r.status,
          r.subscriptionPlan,
          r.metricDate ?? '',
          r.ordersTotal,
          r.ordersByOrigin?.BACKOFFICE ?? 0,
          r.ordersByOrigin?.ADMIN_POS ?? 0,
          r.ordersByOrigin?.CLIENT_POS ?? 0,
          r.ordersThisMonth,
          r.orders30d,
          r.quotesTotal,
          r.invoicesTotal,
          r.invoicesUnpaid,
          r.productsTotal,
          r.usersTotal,
          r.usersAdmin,
          r.partnersCustomers,
          r.partnersSuppliers,
          r.revenueTotal,
          r.activeUsers,
          r.apiCalls,
          r.lastActivityAt ?? '',
          r.daysSinceActivity ?? '',
          r.dbSizeBytes,
          r.storageBytes,
          r.quota.worstPct ?? '',
          r.riskScore,
        ].join(','),
      );
    }
    // Trailing newline: POSIX text files end with one, and some spreadsheet
    // importers drop the final record without it.
    return `${lines.join('\n')}\n`;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private today(): string {
    return reportingDate(
      new Date(),
      this.configService.get<string>('METRICS_TIMEZONE'),
    );
  }
}

function quotaLine(used: number, limit: number): QuotaLine {
  const hasLimit = Number.isFinite(limit) && limit > 0;
  return {
    used,
    limit: limit ?? 0,
    pct: hasLimit ? Math.round((used / limit) * 1000) / 10 : null,
    exceeded: hasLimit ? used > limit : false,
  };
}

function summariseHealth(
  tenantId: number,
  r: Record<string, string>,
): TenantHealthSummary {
  const requests = Number(r.requests ?? 0);
  const errors4xx = Number(r.errors4xx ?? 0);
  const errors5xx = Number(r.errors5xx ?? 0);
  const sumMs = Number(r.sum_ms ?? 0);
  return {
    tenantId,
    requests,
    errors4xx,
    errors5xx,
    // Only 5xx counts as "failing" — a 404 or a rejected login is the system
    // working correctly, and folding those in makes every tenant look broken.
    errorRate: requests ? (errors5xx / requests) * 100 : 0,
    slowRequests: Number(r.slow ?? 0),
    avgLatencyMs: requests ? Math.round(sumMs / requests) : 0,
    p95LatencyMs: Number(r.p95_ms ?? 0),
    maxLatencyMs: Number(r.max_ms ?? 0),
  };
}

/** Quote a CSV cell only when it needs it. */
function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
