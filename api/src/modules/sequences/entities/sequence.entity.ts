import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Dedicated sequences table — replaces the JSON blob inside `configurations`.
 * Each row represents one document-numbering sequence per tenant.
 * The `nextNumber` counter is incremented atomically via `UPDATE … RETURNING`.
 */
@Entity('sequences')
@Index(['entityType'], { unique: true })
export class Sequence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Identity ─────────────────────────────────────────────────────────────

  /** e.g. 'invoice_sale', 'order', 'receipt' */
  @Column({ type: 'varchar', length: 50, name: 'entity_type' })
  entityType: string;

  /** Human-readable label, e.g. 'Factures de vente' */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  // ─── Format configuration ─────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 20, default: '' })
  prefix: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  suffix: string;

  /** Zero-pad length for the sequence counter, e.g. 4 → '0042' */
  @Column({ type: 'int', default: 4, name: 'number_length' })
  numberLength: number;

  @Column({ type: 'boolean', default: true, name: 'year_in_format' })
  yearInFormat: boolean;

  @Column({ type: 'boolean', default: true, name: 'month_in_format' })
  monthInFormat: boolean;

  @Column({ type: 'boolean', default: false, name: 'day_in_format' })
  dayInFormat: boolean;

  @Column({ type: 'boolean', default: false, name: 'trimester_in_format' })
  trimesterInFormat: boolean;

  /**
   * Human-readable format template, e.g. 'FA-YYYY-MM-XXXX'.
   * Stored for display purposes; actual formatting is done by helpers.
   */
  @Column({ type: 'varchar', length: 100, name: 'format_template' })
  formatTemplate: string;

  // ─── Reset configuration ──────────────────────────────────────────────────

  /**
   * When the counter auto-resets.
   * Allowed values: 'never' | 'daily' | 'monthly' | 'yearly'
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'yearly',
    name: 'reset_period',
  })
  resetPeriod: string;

  /**
   * The period key at the time of the last generated number.
   * Format depends on resetPeriod:
   *   'yearly'  → '2026'
   *   'monthly' → '2026-04'
   *   'daily'   → '2026-04-04'
   *   'never'   → 'NEVER'
   *
   * On each generation: if today's period key differs from this value,
   * the counter resets to 1 atomically.
   */
  @Column({ type: 'varchar', length: 20, name: 'current_period_key' })
  currentPeriodKey: string;

  // ─── Counter ──────────────────────────────────────────────────────────────

  /**
   * The next number that will be assigned.
   * NEVER increment this in application code — always use the raw SQL
   * `UPDATE sequences SET next_number = … RETURNING …` approach.
   */
  @Column({ type: 'int', default: 1, name: 'next_number' })
  nextNumber: number;

  // ─── Audit ────────────────────────────────────────────────────────────────

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  /** Timestamp of the last number that was generated */
  @Column({ type: 'timestamptz', nullable: true, name: 'last_generated_at' })
  lastGeneratedAt: Date | null;

  /** Timestamp of the last counter reset */
  @Column({ type: 'timestamptz', nullable: true, name: 'last_reset_at' })
  lastResetAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
