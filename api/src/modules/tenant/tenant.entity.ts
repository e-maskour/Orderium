import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Payment } from '../tenant-lifecycle/entities/payment.entity';
import { TenantActivityLog } from '../tenant-lifecycle/entities/tenant-activity-log.entity';

export type TenantStatus =
  | 'trial'
  | 'active'
  | 'expired'
  | 'suspended'
  | 'disabled'
  | 'archived'
  | 'deleted';

export type SubscriptionPlan = 'trial' | 'basic' | 'pro' | 'enterprise';

/**
 * Stored in the `orderium_master` database.
 * Each row represents one tenant of the platform.
 */
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  /** Human-readable display name */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  slug: string;

  /** PostgreSQL database name, e.g. "orderium_acme" */
  @Column({ type: 'varchar', length: 100 })
  databaseName: string;

  @Column({ type: 'varchar', length: 255, default: 'localhost' })
  databaseHost: string;

  @Column({ type: 'int', default: 5432 })
  databasePort: number;

  /** Legacy boolean — kept for backwards compat, derived from status */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // ─── Extended profile ───────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  primaryColor: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contactPhone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ─── Status lifecycle ──────────────────────────────────────────────────────

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'trial' })
  status: TenantStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  previousStatus: TenantStatus | null;

  @Column({ type: 'timestamptz', nullable: true })
  statusChangedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  statusReason: string | null;

  // ─── Subscription ──────────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 20, default: 'trial' })
  subscriptionPlan: SubscriptionPlan;

  @Column({ type: 'int', default: 30 })
  trialDays: number;

  @Column({ type: 'timestamptz', nullable: true })
  trialStartedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  trialEndsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  subscriptionStartedAt: Date | null;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  subscriptionEndsAt: Date | null;

  @Column({ type: 'boolean', default: false })
  autoRenew: boolean;

  // ─── Usage limits ──────────────────────────────────────────────────────────

  @Column({ type: 'int', default: 5 })
  maxUsers: number;

  @Column({ type: 'int', default: 100 })
  maxProducts: number;

  @Column({ type: 'int', default: 500 })
  maxOrdersPerMonth: number;

  @Column({ type: 'int', default: 500 })
  maxStorageMb: number;

  // ─── Misc ──────────────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  disabledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @OneToMany(() => Payment, (p) => p.tenant)
  payments: Payment[];

  @OneToMany(() => TenantActivityLog, (l) => l.tenant)
  activityLogs: TenantActivityLog[];
}
