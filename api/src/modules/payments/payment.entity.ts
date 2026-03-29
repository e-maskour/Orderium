import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Partner } from '../partners/entities/partner.entity';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

export enum PaymentType {
  CASH = 'cash',
  CHECK = 'check',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  MOBILE_PAYMENT = 'mobile_payment',
  OTHER = 'other',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ type: 'int', nullable: true })
  invoiceId: number | null;

  @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: Partner;

  @Column({ type: 'int', nullable: true })
  customerId: number | null;

  @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplierId' })
  supplier: Partner;

  @Column({ type: 'int', nullable: true })
  supplierId: number | null;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({ type: 'date' })
  paymentDate: string;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.CASH,
  })
  paymentType: PaymentType;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  referenceNumber: string; // For check number, transaction ID, etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
