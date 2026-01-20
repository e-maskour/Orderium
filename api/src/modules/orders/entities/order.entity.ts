import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Partner } from '../../partners/entities/partner.entity';
import { Product } from '../../products/entities/product.entity';
import { Warehouse } from '../../inventory/entities/warehouse.entity';
import { Portal } from '../../portal/entities/portal.entity';

@Entity('orders')
@Index(['number'])
@Index(['orderNumber'])
@Index(['customerId'])
@Index(['date'])
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  number: string;

  @ManyToOne(() => Portal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'adminId' })
  admin: Portal;

  @Column({ type: 'int', nullable: true })
  adminId: number | null;

  @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: Partner;

  @Column({ type: 'int', nullable: true })
  customerId: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  orderNumber: string | null;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'date' })
  stockDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'boolean', default: false })
  isClockedOut: boolean;

  @Column({ type: 'int', nullable: true })
  documentTypeId: number | null;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceDocumentNumber: string | null;

  @Column({ type: 'text', nullable: true })
  internalNote: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'int', default: 0 })
  discountType: number;

  @Column({ type: 'int', default: 0 })
  paidStatus: number;

  @Column({ type: 'int', default: 0 })
  discountApplyRule: number;

  @Column({ type: 'int', default: 0 })
  serviceType: number;

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];
}

@Entity('order_items')
@Index(['orderId'])
@Index(['productId'])
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 18, scale: 3, default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 3, default: 0 })
  expectedQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  priceBeforeTax: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'int', default: 0 })
  discountType: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  productCost: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  priceAfterDiscount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  priceBeforeTaxAfterDiscount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAfterDocumentDiscount: number;

  @Column({ type: 'int', default: 0 })
  discountApplyRule: number;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'int' })
  orderId: number;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int', nullable: true })
  productId: number | null;
}
