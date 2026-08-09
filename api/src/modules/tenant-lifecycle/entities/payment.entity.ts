import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Tenant } from '../../tenant/tenant.entity';
import { PaymentInstallment } from './payment-installment.entity';

/**
 * Derived — never stored. Computed in SQL from the validated installments
 * so it can never drift out of sync with the money actually recorded.
 *
 * Precedence: void > paid > overdue > partial > pending
 */
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'void';

export type BillingCycle = 'monthly' | 'yearly';

/**
 * A subscription obligation: what a tenant owes for one billing period.
 *
 * This row records the DEBT, not the money. Money movement lives in
 * `payment_installments` (tranches), one row per act of payment. The
 * balance and status of this row are always derived from those children —
 * there is deliberately no `status` column to fall out of sync.
 */
@Entity('payments')
@Index(['tenantId', 'periodStart'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int' })
  tenantId: number;

  @ManyToOne(() => Tenant, (t) => t.payments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @OneToMany(() => PaymentInstallment, (i) => i.payment)
  installments: PaymentInstallment[];

  /** Total owed for the period. */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amountDue: number;

  /** ISO-4217. All installments on this row must match it. */
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @Column({ type: 'varchar', length: 20 })
  planName: string;

  @Column({ type: 'varchar', length: 10 })
  billingCycle: BillingCycle;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  /** Past this date with a balance outstanding => derived status `overdue`. */
  @Index()
  @Column({ type: 'date' })
  dueDate: string;

  /** The one genuinely manual state: a voided obligation is not derivable. */
  @Column({ type: 'timestamptz', nullable: true })
  voidedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  voidReason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** A Payment enriched with the SQL-computed balance figures. */
export interface PaymentWithBalance extends Payment {
  /** Sum of `validated` installments. */
  amountPaid: number;
  /** `amountDue - amountPaid`, floored at 0. */
  amountRemaining: number;
  /** Sum of `refunded` installments — reported, never netted off. */
  amountRefunded: number;
  status: PaymentStatus;
  /** True whenever a balance is outstanding past `dueDate`, even if partial. */
  isOverdue: boolean;
  installmentCount: number;
}
