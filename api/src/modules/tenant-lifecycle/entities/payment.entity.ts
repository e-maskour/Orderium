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
import { Tenant } from '../../tenant/tenant.entity';

export type PaymentStatus = 'pending' | 'validated' | 'rejected' | 'refunded';
export type PaymentMethod =
  | 'bank_transfer'
  | 'cash'
  | 'check'
  | 'card'
  | 'other';
export type BillingCycle = 'monthly' | 'yearly';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int' })
  tenantId: number;

  @ManyToOne(() => Tenant, (t) => t.payments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: PaymentMethod | null;

  @Column({ type: 'varchar', length: 20 })
  planName: string;

  @Column({ type: 'varchar', length: 10 })
  billingCycle: BillingCycle;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  validatedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceNumber: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  receiptUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
