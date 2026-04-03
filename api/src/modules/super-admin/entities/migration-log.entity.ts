import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type MigrationOperation = 'run' | 'revert' | 'run-all';
export type MigrationRunStatus = 'success' | 'failed';

@Entity('migration_run_logs')
@Index(['tenantId'])
@Index(['executedAt'])
@Index(['status'])
export class MigrationRunLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tenantId: number;

  @Column({ type: 'varchar', length: 100 })
  tenantSlug: string;

  @Column({ type: 'varchar', length: 255 })
  tenantName: string;

  @Column({ type: 'varchar', length: 20 })
  operation: MigrationOperation;

  @Column({ type: 'varchar', length: 20 })
  status: MigrationRunStatus;

  @Column({ type: 'jsonb', nullable: true })
  migrationsExecuted: string[] | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ name: 'executed_at' })
  executedAt: Date;
}
