import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

/**
 * One row per tenant per day, stored in `orderium_master`.
 *
 * Written by two independent producers:
 *  - {@link MetricsCollectorService} fills the "data at rest" columns (L1) by
 *    walking each tenant database once a night.
 *  - {@link UsageTrackerService} fills the activity/usage columns (L2/L3) by
 *    flushing Redis counters every few minutes.
 *
 * Both use an upsert keyed on (tenantId, metricDate), so neither clobbers the
 * other's columns.
 */
@Entity('tenant_daily_metrics')
@Unique('UQ_tenant_daily_metrics_tenant_date', ['tenantId', 'metricDate'])
export class TenantDailyMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int' })
  tenantId: number;

  /** Calendar day this row describes, in the platform reporting timezone. */
  @Index()
  @Column({ type: 'date' })
  metricDate: string;

  // ─── L1 · Documents ────────────────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  ordersTotal: number;

  /** `{ BACKOFFICE: n, ADMIN_POS: n, CLIENT_POS: n }` */
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  ordersByOrigin: Record<string, number>;

  /** `{ draft: n, pending: n, delivered: n, ... }` */
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  ordersByStatus: Record<string, number>;

  /** Orders created on `metricDate` itself — the daily delta. */
  @Column({ type: 'int', default: 0 })
  ordersToday: number;

  /** Orders created since the first of `metricDate`'s month — quota basis. */
  @Column({ type: 'int', default: 0 })
  ordersThisMonth: number;

  @Column({ type: 'int', default: 0 })
  quotesTotal: number;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  quotesByStatus: Record<string, number>;

  @Column({ type: 'int', default: 0 })
  quotesToday: number;

  @Column({ type: 'int', default: 0 })
  invoicesTotal: number;

  @Column({ type: 'int', default: 0 })
  invoicesUnpaid: number;

  @Column({ type: 'int', default: 0 })
  invoicesToday: number;

  // ─── L1 · Money ────────────────────────────────────────────────────────────

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  revenueTotal: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  revenueThisMonth: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  invoicedTotal: number;

  // ─── L1 · Catalogue & people ───────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  usersTotal: number;

  @Column({ type: 'int', default: 0 })
  usersAdmin: number;

  @Column({ type: 'int', default: 0 })
  usersClient: number;

  @Column({ type: 'int', default: 0 })
  productsTotal: number;

  @Column({ type: 'int', default: 0 })
  partnersCustomers: number;

  @Column({ type: 'int', default: 0 })
  partnersSuppliers: number;

  // ─── L1 · Footprint ────────────────────────────────────────────────────────

  @Column({ type: 'bigint', default: 0, transformer: numericTransformer })
  dbSizeBytes: number;

  @Column({ type: 'bigint', default: 0, transformer: numericTransformer })
  storageBytes: number;

  // ─── L2 · Activity ─────────────────────────────────────────────────────────

  /** Distinct authenticated user ids seen on `metricDate`. */
  @Column({ type: 'int', default: 0 })
  activeUsers: number;

  @Column({ type: 'int', default: 0 })
  loginCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastActivityAt: Date | null;

  // ─── L3 · Feature usage ────────────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  apiCalls: number;

  /** `{ orders: n, inventory: n, pos: n, ... }` — first path segment of the route. */
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  callsByModule: Record<string, number>;

  // ─── Collection metadata ───────────────────────────────────────────────────

  /** When the L1 collector last wrote this row. Null until it has run. */
  @Column({ type: 'timestamptz', nullable: true })
  collectedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  durationMs: number | null;

  /**
   * Non-null when the collector could not fully read this tenant's database.
   * The row is still written so the gap is visible in the UI rather than silent.
   */
  @Column({ type: 'text', nullable: true })
  collectionError: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
