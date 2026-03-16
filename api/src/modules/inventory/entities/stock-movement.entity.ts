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

export enum MovementType {
  RECEIPT = 'receipt', // Incoming from supplier
  DELIVERY = 'delivery', // Outgoing to customer
  INTERNAL = 'internal', // Transfer between warehouses
  ADJUSTMENT = 'adjustment', // Inventory adjustment
  PRODUCTION_IN = 'production_in', // Manufacturing output
  PRODUCTION_OUT = 'production_out', // Manufacturing consumption
  RETURN_IN = 'return_in', // Customer return
  RETURN_OUT = 'return_out', // Return to supplier
  SCRAP = 'scrap', // Scrapped/damaged
}

export enum MovementStatus {
  DRAFT = 'draft',
  WAITING = 'waiting',
  CONFIRMED = 'confirmed',
  ASSIGNED = 'assigned',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

@Entity('stock_movements')
@Index(['productId'])
@Index(['sourceWarehouseId'])
@Index(['destWarehouseId'])
@Index(['status'])
@Index(['movementType'])
@Index(['reference'])
@Index(['dateScheduled'])
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  reference: string; // e.g., "IN/00001", "OUT/00001", "INT/00001"

  @Column({
    type: 'enum',
    enum: MovementType,
    default: MovementType.INTERNAL,
  })
  movementType: MovementType;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Warehouse, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sourceWarehouseId' })
  sourceWarehouse: Warehouse | null;

  @Column({ type: 'int', nullable: true })
  sourceWarehouseId: number | null;

  @ManyToOne(() => Warehouse, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'destWarehouseId' })
  destWarehouse: Warehouse | null;

  @Column({ type: 'int', nullable: true })
  destWarehouseId: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: number;

  @ManyToOne(() => UnitOfMeasure, { nullable: true })
  @JoinColumn({ name: 'unitOfMeasureId' })
  unitOfMeasure: UnitOfMeasure | null;

  @Column({ type: 'int', nullable: true })
  unitOfMeasureId: number;

  @Column({
    type: 'enum',
    enum: MovementStatus,
    default: MovementStatus.DRAFT,
  })
  status: MovementStatus;

  @Column({ type: 'timestamp', nullable: true })
  dateScheduled: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  dateDone: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  origin: string; // Reference to related document (invoice, order, etc.)

  @Column({ type: 'varchar', length: 100, nullable: true })
  lotNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'int', nullable: true })
  validatedByUserId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  partnerName: string; // Customer or Supplier name

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}
