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
import { Warehouse } from '../../inventory/entities/warehouse.entity';

@Entity('products')
@Index(['name'])
@Index(['code'])
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'boolean', default: false })
  isService: boolean;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  isPriceChangeAllowed: boolean;

  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'int', nullable: true })
  stock: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  saleTax: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  purchaseTax: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  minPrice: number;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}
