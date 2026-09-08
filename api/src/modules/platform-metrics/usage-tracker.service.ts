import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, LessThan } from 'typeorm';
import type { Redis } from 'ioredis';
import { Tenant } from '../tenant/tenant.entity';
import { TenantDailyMetric } from './entities/tenant-daily-metric.entity';
import { TenantHealthBucket } from './entities/tenant-health-bucket.entity';
import { REDIS_CLIENT } from './platform-metrics.constants';
import {
  hourStart,
  latencyBucketIndex,
  LATENCY_BUCKETS_MS,
  quantileFromBuckets,
  reportingDate,
} from './metrics.util';

/** Namespace for every key this service owns, so a FLUSH-free cleanup is possible. */
const NS = 'pm';

/**
 * How long counter keys survive in Redis. Comfortably longer than the flush
 * interval so a brief outage loses nothing, short enough that a permanent
 * Postgres failure cannot fill Redis indefinitely.
 */
const DAILY_TTL_SECONDS = 3 * 24 * 3600;
const HOURLY_TTL_SECONDS = 6 * 3600;

/** Requests slower than this are counted as slow. */
const SLOW_REQUEST_MS = 1000;

/** How long hourly health buckets are retained in Postgres. */
const HEALTH_RETENTION_DAYS = 30;

export interface RequestSample {
  tenantSlug: string;
  /** First path segment after `/api`, e.g. `orders`. Used as the module label. */
  module: string;
  userId: number | string | null;
  statusCode: number;
  durationMs: number;
  isLogin: boolean;
}

/**
 * Aggregates per-request activity in Redis and flushes it to `orderium_master`
 * on a timer.
 *
 * The hot path does counter increments only — no Postgres write per request,
 * and every Redis call is fire-and-forget. If Redis is down, requests still
 * succeed and the only casualty is a gap in the usage charts.
 */
@Injectable()
export class UsageTrackerService implements OnModuleDestroy {
  private readonly logger = new Logger(UsageTrackerService.name);

  /** slug → tenant id, refreshed periodically. Avoids a lookup per flush. */
  private slugToId = new Map<string, number>();
  private slugCacheLoadedAt = 0;

  /** Set once when Redis first fails, to avoid logging on every request. */
  private redisDegraded = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
    @InjectRepository(Tenant, 'master')
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantDailyMetric, 'master')
    private readonly dailyRepo: Repository<TenantDailyMetric>,
    @InjectRepository(TenantHealthBucket, 'master')
    private readonly healthRepo: Repository<TenantHealthBucket>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    // Best-effort final flush so a rolling deploy does not drop the last window.
    await this.flush().catch(() => undefined);
  }

  // ─── Hot path ──────────────────────────────────────────────────────────────

  /**
   * Record one request. Never throws and never awaits Postgres.
   *
   * Deliberately not `async` from the caller's perspective: the interceptor
   * fires this and moves on.
   */
  record(sample: RequestSample): void {
    if (!this.redis) return;

    const date = this.reportingDay();
    const hour = hourStart(new Date()).toISOString();
    const dayKey = `${NS}:d:${sample.tenantSlug}:${date}`;
    const hourKey = `${NS}:h:${sample.tenantSlug}:${hour}`;

    const pipeline = this.redis.pipeline();

    // ── L3 · feature usage
    pipeline.hincrby(`${dayKey}:calls`, sample.module, 1);
    pipeline.hincrby(`${dayKey}:calls`, '__total', 1);
    pipeline.expire(`${dayKey}:calls`, DAILY_TTL_SECONDS);

    // ── L2 · activity
    if (sample.userId != null) {
      pipeline.sadd(`${dayKey}:users`, String(sample.userId));
      pipeline.expire(`${dayKey}:users`, DAILY_TTL_SECONDS);
    }
    if (sample.isLogin && sample.statusCode < 400) {
      pipeline.incr(`${dayKey}:logins`);
      pipeline.expire(`${dayKey}:logins`, DAILY_TTL_SECONDS);
    }
    pipeline.set(
      `${dayKey}:last`,
      new Date().toISOString(),
      'EX',
      DAILY_TTL_SECONDS,
    );

    // ── L4 · health
    pipeline.hincrby(hourKey, 'req', 1);
    if (sample.statusCode >= 500) {
      pipeline.hincrby(hourKey, 'e5', 1);
    } else if (sample.statusCode >= 400) {
      pipeline.hincrby(hourKey, 'e4', 1);
    }
    if (sample.durationMs >= SLOW_REQUEST_MS) {
      pipeline.hincrby(hourKey, 'slow', 1);
    }
    pipeline.hincrby(hourKey, 'sumMs', Math.round(sample.durationMs));
    pipeline.hincrby(hourKey, `lb${latencyBucketIndex(sample.durationMs)}`, 1);
    pipeline.expire(hourKey, HOURLY_TTL_SECONDS);

    // ── Dirty sets tell the flusher what changed without a KEYS scan
    pipeline.sadd(`${NS}:dirty:d`, `${sample.tenantSlug}|${date}`);
    pipeline.sadd(`${NS}:dirty:h`, `${sample.tenantSlug}|${hour}`);

    pipeline.exec().catch((err: Error) => {
      if (!this.redisDegraded) {
        this.redisDegraded = true;
        this.logger.warn(
          `Usage tracking degraded — Redis unavailable: ${err.message}`,
        );
      }
    });
  }

  /**
   * Track the maximum observed latency separately.
   *
   * HINCRBY cannot express "max", so this is a compare-and-set that only runs
   * for genuinely slow requests — the common fast path stays a pure pipeline.
   */
  recordSlowPeak(tenantSlug: string, durationMs: number): void {
    if (!this.redis || durationMs < SLOW_REQUEST_MS) return;
    const hourKey = `${NS}:h:${tenantSlug}:${hourStart(new Date()).toISOString()}`;
    void this.redis
      .hget(hourKey, 'maxMs')
      .then((current) => {
        if (!current || Number(current) < durationMs) {
          return this.redis?.hset(hourKey, 'maxMs', Math.round(durationMs));
        }
        return undefined;
      })
      .catch(() => undefined);
  }

  // ─── Flush ─────────────────────────────────────────────────────────────────

  /**
   * Move Redis counters into Postgres.
   *
   * Runs every two minutes: often enough that the dashboard feels live,
   * rare enough that it is a rounding error on database load.
   */
  @Cron('*/2 * * * *', { name: 'platform-metrics-flush' })
  async flushScheduled(): Promise<void> {
    await this.flush().catch((err: Error) => {
      this.logger.error(`Usage flush failed: ${err.message}`);
    });
  }

  /**
   * Both halves always run: an hourly failure must not be hidden behind a
   * daily one, and vice versa. Errors are aggregated and rethrown once so the
   * caller learns something went wrong without either half being skipped.
   */
  async flush(): Promise<{ daily: number; hourly: number }> {
    if (!this.redis) return { daily: 0, hourly: 0 };
    await this.refreshSlugCache();

    const errors: string[] = [];
    let daily = 0;
    let hourly = 0;

    try {
      daily = await this.flushDaily();
    } catch (err) {
      errors.push(`daily: ${(err as Error).message}`);
    }
    try {
      hourly = await this.flushHourly();
    } catch (err) {
      errors.push(`hourly: ${(err as Error).message}`);
    }

    if (errors.length) {
      throw new Error(errors.join('; '));
    }
    return { daily, hourly };
  }

  private async flushDaily(): Promise<number> {
    if (!this.redis) return 0;

    // SPOP drains the work list atomically, so a concurrent flush cannot
    // process the same entry twice.
    const entries = await this.redis.spop(`${NS}:dirty:d`, 500);
    if (!entries?.length) return 0;

    let written = 0;
    for (const entry of entries) {
      try {
        written += await this.flushDailyEntry(entry);
      } catch (err) {
        // Put the entry back so the next flush retries it. SPOP already
        // removed it, and the counters themselves are still in Redis, so a
        // transient database error costs a delay rather than a data gap.
        await this.redis.sadd(`${NS}:dirty:d`, entry).catch(() => undefined);
        this.logger.error(
          `Failed to flush daily usage for '${entry}': ${(err as Error).message}`,
        );
      }
    }
    return written;
  }

  private async flushDailyEntry(entry: string): Promise<number> {
    if (!this.redis) return 0;

    const [slug, date] = entry.split('|');
    const tenantId = this.slugToId.get(slug);
    if (!tenantId || !date) return 0;

    const base = `${NS}:d:${slug}:${date}`;
    const [calls, activeUsers, logins, last] = await Promise.all([
      this.redis.hgetall(`${base}:calls`),
      this.redis.scard(`${base}:users`),
      this.redis.get(`${base}:logins`),
      this.redis.get(`${base}:last`),
    ]);

    const callsByModule: Record<string, number> = {};
    let apiCalls = 0;
    for (const [k, v] of Object.entries(calls ?? {})) {
      if (k === '__total') {
        apiCalls = Number(v);
      } else {
        callsByModule[k] = Number(v);
      }
    }

    await this.dailyRepo
      .createQueryBuilder()
      .insert()
      .into(TenantDailyMetric)
      .values({
        tenantId,
        metricDate: date,
        activeUsers: activeUsers ?? 0,
        loginCount: logins ? Number(logins) : 0,
        lastActivityAt: last ? new Date(last) : null,
        apiCalls,
        callsByModule,
        // These belong to the collector, but they must still be named here.
        // `numericTransformer.to(undefined)` returns null, so TypeORM emits an
        // explicit NULL for an omitted numeric column instead of letting the
        // database default apply — which a NOT NULL constraint then rejects.
        // Zero is the right value when inserting a row the collector has not
        // reached yet; on conflict these are not in the update list, so a real
        // snapshot is never overwritten.
        revenueTotal: 0,
        revenueThisMonth: 0,
        invoicedTotal: 0,
        dbSizeBytes: 0,
        storageBytes: 0,
      })
      // Only the usage columns — the nightly collector owns the rest of the row.
      .orUpdate(
        [
          'activeUsers',
          'loginCount',
          'lastActivityAt',
          'apiCalls',
          'callsByModule',
        ],
        ['tenantId', 'metricDate'],
      )
      .execute();

    return 1;
  }

  private async flushHourly(): Promise<number> {
    if (!this.redis) return 0;

    const entries = await this.redis.spop(`${NS}:dirty:h`, 500);
    if (!entries?.length) return 0;

    let written = 0;
    for (const entry of entries) {
      try {
        written += await this.flushHourlyEntry(entry);
      } catch (err) {
        await this.redis.sadd(`${NS}:dirty:h`, entry).catch(() => undefined);
        this.logger.error(
          `Failed to flush hourly health for '${entry}': ${(err as Error).message}`,
        );
      }
    }
    return written;
  }

  private async flushHourlyEntry(entry: string): Promise<number> {
    if (!this.redis) return 0;

    // The hour is an ISO timestamp containing colons, so split on the first
    // separator only rather than using split('|').
    const sep = entry.indexOf('|');
    const slug = entry.slice(0, sep);
    const hour = entry.slice(sep + 1);
    const tenantId = this.slugToId.get(slug);
    if (!tenantId || !hour) return 0;

    const h = await this.redis.hgetall(`${NS}:h:${slug}:${hour}`);
    if (!h || !Object.keys(h).length) return 0;

    const bucketCounts = LATENCY_BUCKETS_MS.map((_, i) =>
      Number(h[`lb${i}`] ?? 0),
    );
    bucketCounts.push(Number(h[`lb${LATENCY_BUCKETS_MS.length}`] ?? 0));

    // The histogram estimate is the bucket's upper bound, so it can exceed the
    // slowest request actually seen. Clamp it — a p95 above the observed max
    // is arithmetically impossible and reads as a bug on the dashboard.
    // maxMs is only tracked for slow requests, so 0 means nothing was slow and
    // there is no ceiling to apply.
    const maxMs = Number(h.maxMs ?? 0);
    const p95 = quantileFromBuckets(bucketCounts, 0.95);

    await this.healthRepo
      .createQueryBuilder()
      .insert()
      .into(TenantHealthBucket)
      .values({
        tenantId,
        bucketStart: new Date(hour),
        requests: Number(h.req ?? 0),
        errors4xx: Number(h.e4 ?? 0),
        errors5xx: Number(h.e5 ?? 0),
        slowRequests: Number(h.slow ?? 0),
        latencySumMs: Number(h.sumMs ?? 0),
        latencyMaxMs: maxMs,
        latencyP95Ms: maxMs > 0 ? Math.min(p95, maxMs) : p95,
      })
      .orUpdate(
        [
          'requests',
          'errors4xx',
          'errors5xx',
          'slowRequests',
          'latencySumMs',
          'latencyMaxMs',
          'latencyP95Ms',
        ],
        ['tenantId', 'bucketStart'],
      )
      .execute();

    return 1;
  }

  // ─── Retention ─────────────────────────────────────────────────────────────

  /**
   * Hourly health buckets are high-volume and only useful while an incident is
   * recent. Daily rows keep the long-term trend, so old buckets are dropped.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'platform-metrics-prune' })
  async pruneOldHealthBuckets(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - HEALTH_RETENTION_DAYS);
    const result = await this.healthRepo.delete({
      bucketStart: LessThan(cutoff),
    });
    if (result.affected) {
      this.logger.log(
        `Pruned ${result.affected} health buckets older than ${HEALTH_RETENTION_DAYS} days`,
      );
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async refreshSlugCache(): Promise<void> {
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (Date.now() - this.slugCacheLoadedAt < FIVE_MINUTES) return;
    const tenants = await this.tenantRepo.find({ select: ['id', 'slug'] });
    this.slugToId = new Map(tenants.map((t) => [t.slug, t.id]));
    this.slugCacheLoadedAt = Date.now();
  }

  private reportingDay(): string {
    return reportingDate(
      new Date(),
      this.configService.get<string>('METRICS_TIMEZONE'),
    );
  }
}
