import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

/**
 * One row per tenant per hour, stored in `orderium_master`.
 *
 * Hourly rather than daily because an incident that lasts twenty minutes is
 * invisible in a daily average. Rows older than the retention window are
 * pruned by {@link UsageTrackerService} — the daily rollup in
 * {@link TenantDailyMetric} keeps the long-term signal.
 */
@Entity('tenant_health_buckets')
@Unique('UQ_tenant_health_buckets_tenant_bucket', ['tenantId', 'bucketStart'])
export class TenantHealthBucket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int' })
  tenantId: number;

  /** Start of the hour this bucket covers, UTC. */
  @Index()
  @Column({ type: 'timestamptz' })
  bucketStart: Date;

  @Column({ type: 'int', default: 0 })
  requests: number;

  @Column({ type: 'int', default: 0 })
  errors4xx: number;

  @Column({ type: 'int', default: 0 })
  errors5xx: number;

  /** Requests slower than the slow-request threshold. */
  @Column({ type: 'int', default: 0 })
  slowRequests: number;

  /**
   * Sum of all request durations in the bucket. Kept alongside `requests` so
   * averages can be re-derived when buckets are merged, which a stored mean
   * cannot do correctly.
   */
  @Column({ type: 'bigint', default: 0, transformer: numericTransformer })
  latencySumMs: number;

  @Column({ type: 'int', default: 0 })
  latencyMaxMs: number;

  /**
   * Approximate p95, computed from fixed latency histogram buckets rather than
   * retained samples. Good enough to spot a regression; not a billing number.
   */
  @Column({ type: 'int', default: 0 })
  latencyP95Ms: number;
}
