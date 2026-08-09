import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * What triggered a seeder run.
 *   run        — one seeder, one tenant, chosen explicitly
 *   run-tenant — every pending seeder on one tenant
 *   run-fleet  — one seeder across every tenant
 */
export type SeederOperation = 'run' | 'run-tenant' | 'run-fleet';
export type SeederRunStatus = 'success' | 'failed';

/**
 * One row per seeder execution against one tenant.
 *
 * Lives in the master database alongside `migration_run_logs`, so the audit
 * trail survives anything that happens to a tenant database.
 */
@Entity('seeder_run_logs')
@Index(['tenantId'])
@Index(['seederKey'])
@Index(['executedAt'])
@Index(['status'])
export class SeederRunLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tenantId: number;

  @Column({ type: 'varchar', length: 100 })
  tenantSlug: string;

  @Column({ type: 'varchar', length: 255 })
  tenantName: string;

  @Column({ type: 'varchar', length: 60 })
  seederKey: string;

  @Column({ type: 'varchar', length: 120 })
  seederName: string;

  @Column({ type: 'varchar', length: 20 })
  operation: SeederOperation;

  @Column({ type: 'varchar', length: 20 })
  status: SeederRunStatus;

  @Column({ type: 'int', default: 0 })
  created: number;

  @Column({ type: 'int', default: 0 })
  pruned: number;

  /**
   * Names of the options the caller supplied — keys only, never values.
   * Seeder options can carry passwords, which must not reach this table.
   */
  @Column({ type: 'jsonb', nullable: true })
  optionsUsed: string[] | null;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ name: 'executed_at' })
  executedAt: Date;
}
