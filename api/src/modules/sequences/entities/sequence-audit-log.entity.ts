import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Immutable audit log of every document number generated.
 * Enables gap detection, duplicate detection, and legal compliance
 * for Moroccan tax authorities (factures).
 */
@Entity('sequence_audit_log')
@Index(['entityType'])
@Index(['documentNumber'])
export class SequenceAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK to sequences.id — stored as plain column for performance */
  @Column({ type: 'uuid', name: 'sequence_id' })
  sequenceId: string;

  /** Denormalised for fast queries without join */
  @Column({ type: 'varchar', length: 50, name: 'entity_type' })
  entityType: string;

  /** The raw integer that was assigned (before formatting) */
  @Column({ type: 'int', name: 'assigned_number' })
  assignedNumber: number;

  /** The full formatted document number, e.g. 'FA-2026-04-0001' */
  @Column({ type: 'varchar', length: 100, name: 'document_number' })
  documentNumber: string;

  /** The period key at the time of generation, e.g. '2026-04' */
  @Column({ type: 'varchar', length: 20, name: 'period_key' })
  periodKey: string;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt: Date;

  /**
   * Portal user ID who triggered the generation — null for system calls.
   * Stored as plain integer (no FK) to avoid cross-module coupling.
   */
  @Column({ type: 'int', nullable: true, name: 'generated_by' })
  generatedBy: number | null;

  /**
   * Optional metadata: linked entity ID, endpoint, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
