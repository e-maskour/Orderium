import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Warehouse } from './warehouse.entity';
import { UnitOfMeasure } from './unit-of-measure.entity';

@Entity('stock_quants')
@Index(['productId', 'warehouseId'], { unique: true })
@Index(['productId'])
@Index(['warehouseId'])
export class StockQuant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ type: 'int' })
  warehouseId: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  reservedQuantity: number; // Quantity reserved for orders

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  availableQuantity: number; // quantity - reservedQuantity

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  incomingQuantity: number; // Expected from purchase orders

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  outgoingQuantity: number; // Expected for delivery orders

  @ManyToOne(() => UnitOfMeasure, { nullable: true })
  @JoinColumn({ name: 'unitOfMeasureId' })
  unitOfMeasure: UnitOfMeasure;

  @Column({ type: 'int', nullable: true })
  unitOfMeasureId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lotNumber: string; // For batch tracking

  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNumber: string; // For serial tracking

  @Column({ type: 'timestamp', nullable: true })
  expirationDate: Date;

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}
