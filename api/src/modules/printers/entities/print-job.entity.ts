import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Portal } from '../../portal/entities/portal.entity';
import { Printer } from './printer.entity';

/**
 * Legacy transports, retained only so historical rows stay readable.
 * @deprecated no longer written; the print agent reports an agentId instead.
 */
export type PrintMethod = 'epson-epos' | 'star-webprnt' | 'qztray' | 'browser';

/**
 * Queue lifecycle.
 *
 * `claimed` means an agent has taken the job but has NOT yet sent bytes to the
 * device — safe to requeue. `printing` means bytes were sent and the job may
 * have physically printed, so it is never retried automatically.
 */
export type PrintJobStatus =
  | 'queued'
  | 'claimed'
  | 'printing'
  | 'done'
  | 'failed'
  | 'cancelled';

@Entity('print_jobs')
@Index(['printedAt'])
export class PrintJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'printer_id', type: 'uuid', nullable: true })
  printerId: string | null;

  @ManyToOne(() => Printer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'printer_id' })
  printer: Printer | null;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => Portal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: Portal | null;

  @Column({ name: 'document_type', length: 30 })
  documentType: string;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  method: PrintMethod | null;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status: PrintJobStatus;

  /** Denormalised from the printer so routing survives printer deletion. */
  @Column({ name: 'warehouse_id', type: 'int', nullable: true })
  warehouseId: number | null;

  /** The agent currently holding this job, if any. */
  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId: string | null;

  /** Integer id of the source document (order, invoice, quote…). */
  @Column({ name: 'document_ref', type: 'int', nullable: true })
  documentRef: number | null;

  /** Collapses repeated clicks on one button into a single job. */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 200 })
  idempotencyKey: string;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ name: 'queued_at', type: 'timestamptz', default: () => 'now()' })
  queuedAt: Date;

  @Column({ name: 'claimed_at', type: 'timestamptz', nullable: true })
  claimedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'printed_at' })
  printedAt: Date;
}
