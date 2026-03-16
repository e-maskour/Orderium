import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Partner } from '../../partners/entities/partner.entity';
import {
  BaseDocument,
  BaseStandardItem,
} from '../../../common/entities/base-document.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

@Entity('invoices')
@Index(['documentNumber'])
@Index(['customerId'])
@Index(['supplierId'])
@Index(['date'])
@Index(['status'])
export class Invoice extends BaseDocument {
  // Override documentNumber to use invoiceNumber for backwards compatibility
  get invoiceNumber(): string {
    return this.documentNumber;
  }

  set invoiceNumber(value: string) {
    this.documentNumber = value;
  }

  // Customer fields inherited from BaseDocument

  @Column({ type: 'int', nullable: true })
  supplierId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplierName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  supplierPhone: string;

  @Column({ type: 'text', nullable: true })
  supplierAddress: string;

  // date inherited from BaseDocument

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  // subtotal, tax, discount, discountType, total inherited from BaseDocument

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  // isValidated inherited from BaseDocument

  @Column({ type: 'date', nullable: true })
  validationDate: Date | null;

  @Column({ type: 'text', nullable: true })
  pdfUrl: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  remainingAmount: number;

  // notes, dateCreated, dateUpdated, customer relationship inherited from BaseDocument

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Partner;

  @OneToMany(() => InvoiceItem, (item) => item.invoice)
  items: InvoiceItem[];

  @BeforeInsert()
  @BeforeUpdate()
  validateStatus() {
    // Ensure status is consistent with isValidated field
    if (!this.isValidated) {
      // If not validated, status must be DRAFT
      this.status = InvoiceStatus.DRAFT;
    } else if (this.isValidated && this.status === InvoiceStatus.DRAFT) {
      // If validated but status is still DRAFT, change to UNPAID
      this.status = InvoiceStatus.UNPAID;
    }
  }
}

@Entity('invoice_items')
@Index(['invoiceId'])
@Index(['productId'])
export class InvoiceItem extends BaseStandardItem {
  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ type: 'int' })
  invoiceId: number;

  // product relationship and productId inherited from BaseStandardItem
}
