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
import { Customer } from '../../customers/entities/customer.entity';

@Entity('documents')
@Index(['number'])
@Index(['orderNumber'])
@Index(['customerId'])
@Index(['date'])
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  number: string;

  @Column({ type: 'int', nullable: true })
  adminId: number;

  @Column({ type: 'int', nullable: true })
  customerId: number;

  @Column({ type: 'int', nullable: true })
  cashRegisterId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  orderNumber: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'date' })
  stockDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'boolean', default: false })
  isClockedOut: boolean;

  @Column({ type: 'int' })
  documentTypeId: number;

  @Column({ type: 'int' })
  warehouseId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceDocumentNumber: string;

  @Column({ type: 'text', nullable: true })
  internalNote: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

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

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @OneToMany(() => DocumentItem, (item) => item.document)
  items: DocumentItem[];
}

@Entity('document_items')
@Index(['documentId'])
@Index(['productId'])
export class DocumentItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  documentId: number;

  @Column({ type: 'int' })
  productId: number;

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

  @ManyToOne(() => Document, (document) => document.items)
  @JoinColumn({ name: 'documentId' })
  document: Document;
}
