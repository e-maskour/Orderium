import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Partner } from '../../modules/partners/entities/partner.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { numericTransformer } from '../transformers/numeric.transformer';

export enum DocumentDirection {
  VENTE = 'VENTE',
  ACHAT = 'ACHAT',
}

// Minimal base for all document entities
export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  total: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  discount: number;

  @Column({ type: 'int', default: 0 })
  discountType: number;

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;

  @Column({ type: 'int', nullable: true })
  customerId: number | null;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Partner;
}

// Extended base for Quote and Invoice (with customer details)
export abstract class BaseDocument extends BaseEntity {
  @Column({
    type: 'enum',
    enum: DocumentDirection,
    default: DocumentDirection.VENTE,
  })
  direction: DocumentDirection;

  @Column({ type: 'varchar', length: 50, unique: true })
  documentNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customerPhone: string;

  @Column({ type: 'text', nullable: true })
  customerAddress: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  tax: number;

  @Column({ type: 'boolean', default: false })
  isValidated: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;
}

// Base for all document items
export abstract class BaseDocumentItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  productId: number | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  discount: number;

  @Column({ type: 'int', default: 0 })
  discountType: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  total: number;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product;
}

// Extended base for Quote and Invoice items (with standard pricing)
export abstract class BaseStandardItem extends BaseDocumentItem {
  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  unitPrice: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  tax: number;
}
