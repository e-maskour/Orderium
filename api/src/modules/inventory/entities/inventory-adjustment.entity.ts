import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Warehouse } from './warehouse.entity';
import { Product } from '../../products/entities/product.entity';

export enum AdjustmentStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

@Entity('inventory_adjustments')
@Index(['reference'])
@Index(['warehouseId'])
@Index(['status'])
@Index(['adjustmentDate'])
export class InventoryAdjustment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  reference: string; // e.g., "ADJ/00001"

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ type: 'int' })
  warehouseId: number;

  @Column({
    type: 'enum',
    enum: AdjustmentStatus,
    default: AdjustmentStatus.DRAFT,
  })
  status: AdjustmentStatus;

  @Column({ type: 'timestamp', nullable: true })
  adjustmentDate: Date | null;

  @Column({ type: 'int', nullable: true })
  userId: number | null; // User who created/validated

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => AdjustmentLine, (line) => line.adjustment, {
    cascade: true,
  })
  lines: AdjustmentLine[];

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}

@Entity('inventory_adjustment_lines')
@Index(['adjustmentId'])
@Index(['productId'])
export class AdjustmentLine {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => InventoryAdjustment, (adj) => adj.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'adjustmentId' })
  adjustment: InventoryAdjustment;

  @Column({ type: 'int' })
  adjustmentId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0, transformer: numericTransformer })
  theoreticalQuantity: number; // System quantity

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0, transformer: numericTransformer })
  countedQuantity: number; // Actual counted quantity

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0, transformer: numericTransformer })
  difference: number; // countedQuantity - theoreticalQuantity

  @Column({ type: 'varchar', length: 100, nullable: true })
  lotNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}
