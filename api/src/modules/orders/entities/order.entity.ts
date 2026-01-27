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
import { Product } from '../../products/entities/product.entity';
import { BaseDocument, BaseStandardItem } from '../../../common/entities/base-document.entity';

export enum OrderStatus {
  DRAFT = 'draft',           // Brouillon
  VALIDATED = 'validated',   // Validée
  IN_PROGRESS = 'in_progress', // En cours
  DELIVERED = 'delivered',   // Livrée
  INVOICED = 'invoiced',     // Facturée
  CANCELLED = 'cancelled',   // Annulée
}

@Entity('orders')
@Index(['documentNumber'])
@Index(['customerId'])
@Index(['date'])
export class Order extends BaseDocument {
  // Override documentNumber to use orderNumber for backwards compatibility
  get orderNumber(): string {
    return this.documentNumber;
  }

  set orderNumber(value: string) {
    this.documentNumber = value;
  }

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'int', nullable: true })
  convertedToInvoiceId: number | null; // Reference to invoice if converted

  @Column({ type: 'boolean', default: false })
  fromPortal: boolean; // Indicates if order was created from delivery portal

  // isValidated inherited from BaseDocument

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.DRAFT,
  })
  status: OrderStatus;

  // notes, dateCreated, dateUpdated, customer relationship inherited from BaseDocument

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @BeforeInsert()
  @BeforeUpdate()
  validateStatus() {
    // Ensure status is consistent with isValidated field
    // Only enforce rules for non-terminal statuses
    if (!this.isValidated) {
      // If not validated, status must be DRAFT (unless it's a terminal status)
      if (this.status !== OrderStatus.INVOICED && 
          this.status !== OrderStatus.CANCELLED && 
          this.status !== OrderStatus.DELIVERED) {
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
