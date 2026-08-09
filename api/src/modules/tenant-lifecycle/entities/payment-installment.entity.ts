import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Payment } from './payment.entity';
import { Tenant } from '../../tenant/tenant.entity';

export type PaymentMethod =
  | 'bank_transfer'
  | 'cash'
  | 'check'
  | 'card'
  | 'other';

/** Only `validated` counts toward the parent balance. */
export type InstallmentStatus =
  | 'pending'
  | 'validated'
  | 'rejected'
  | 'refunded';

/**
 * A tranche: one act of payment against a `Payment` obligation.
 *
 * A single obligation may be settled across many of these, each with its
 * own type and date. Mirrors the `OrderPayment` pattern already used for
 * customer-side partial payments inside tenant databases.
 */
@Entity('payment_installments')
@Index(['paymentId', 'status'])
export class PaymentInstallment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => Payment, (p) => p.installments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  /**
   * Denormalised from the parent so per-tenant rollups and the global
   * payments list can aggregate without a second join.
   */
  @Index()
  @Column({ type: 'int' })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  /** When the money actually moved — not when the row was created. */
  @Index()
  @Column({ type: 'date' })
  paymentDate: string;

  @Column({ type: 'varchar', length: 20 })
  paymentType: PaymentMethod;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: InstallmentStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceNumber: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  receiptUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  validatedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
