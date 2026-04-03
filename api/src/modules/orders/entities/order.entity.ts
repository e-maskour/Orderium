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
import {
  BaseDocument,
  BaseStandardItem,
} from '../../../common/entities/base-document.entity';
import { Partner } from '../../partners/entities/partner.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

export enum OrderStatus {
  DRAFT = 'draft', // Brouillon
  VALIDATED = 'validated', // Validée
  IN_PROGRESS = 'in_progress', // En cours
  CONFIRMED = 'confirmed', // Confirmé
  PICKED_UP = 'picked_up', // Récupéré
  DELIVERED = 'delivered', // Livrée
  INVOICED = 'invoiced', // Facturée
  CANCELLED = 'cancelled', // Annulée
}

export enum DeliveryStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  CONFIRMED = 'confirmed',
  PICKED_UP = 'picked_up',
  TO_DELIVERY = 'to_delivery',
  IN_DELIVERY = 'in_delivery',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

export enum OrderOriginType {
  BACKOFFICE = 'BACKOFFICE',
  CLIENT_POS = 'CLIENT_POS',
  ADMIN_POS = 'ADMIN_POS',
}

@Entity('orders')
@Index(['documentNumber'])
@Index(['customerId'])
@Index(['supplierId'])
@Index(['date'])
@Index(['status'])
@Index(['deliveryStatus'])
@Index(['originType'])
export class Order extends BaseDocument {
  // Override documentNumber to use orderNumber for backwards compatibility
  get orderNumber(): string {
    return this.documentNumber;
  }

  set orderNumber(value: string) {
    this.documentNumber = value;
  }

  // Supplier fields for purchase orders (bon d'achat)
  @Column({ type: 'int', nullable: true })
  supplierId: number | null;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Partner;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplierName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  supplierPhone: string;

  @Column({ type: 'text', nullable: true })
  supplierAddress: string;

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  /** Payment due date — triggers overdue alerts when remainingAmount > 0 past this date */
  @Column({ type: 'date', nullable: true, name: 'amount_due_date' })
  amountDueDate: Date | null;

  @Column({ type: 'date', nullable: true })
  validationDate: Date | null;

  @Column({ type: 'text', nullable: true })
  pdfUrl: string | null;

  @Column({ type: 'int', nullable: true })
  convertedToInvoiceId: number | null; // Reference to invoice if converted

  @Column({ type: 'varchar', length: 50, default: 'BACKOFFICE' })
  originType: string; // BACKOFFICE | CLIENT_POS | ADMIN_POS

  @Column({ type: 'varchar', nullable: true })
  receiptNumber: string | null;

  // isValidated inherited from BaseDocument

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.DRAFT,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    nullable: true,
  })
  deliveryStatus: DeliveryStatus | null;

  @Column({ type: 'timestamp', nullable: true })
  pendingAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  toDeliveryAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  inDeliveryAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  shareToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  shareTokenExpiry: Date | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  paidAmount: number = 0;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  remainingAmount: number = 0;

  // notes, dateCreated, dateUpdated, customer relationship inherited from BaseDocument

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @BeforeInsert()
  @BeforeUpdate()
  validateStatus() {
    // Ensure status is consistent with isValidated field
    // Only enforce rules for non-terminal statuses
    if (!this.isValidated) {
      // If not validated, status must be DRAFT (unless it's a terminal or workflow status)
      if (
        this.status !== OrderStatus.INVOICED &&
        this.status !== OrderStatus.CANCELLED &&
        this.status !== OrderStatus.DELIVERED &&
        this.status !== OrderStatus.CONFIRMED &&
        this.status !== OrderStatus.PICKED_UP
      ) {
        this.status = OrderStatus.DRAFT;
      }
    } else if (this.isValidated && this.status === OrderStatus.DRAFT) {
      // If validated but status is still DRAFT, change to IN_PROGRESS
      this.status = OrderStatus.IN_PROGRESS;
    }
  }
}

@Entity('order_items')
@Index(['orderId'])
@Index(['productId'])
export class OrderItem extends BaseStandardItem {
  // Standard fields (description, unitPrice, tax, quantity, discount, discountType, total, product) inherited from BaseStandardItem

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'int' })
  orderId: number;
}
