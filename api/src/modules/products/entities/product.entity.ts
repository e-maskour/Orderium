import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Warehouse } from '../../inventory/entities/warehouse.entity';
import { Category } from '../../categories/entities/category.entity';
import { UnitOfMeasure } from '../../inventory/entities/unit-of-measure.entity';

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
  imageUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imagePublicId: string | null;

  @Column({ type: 'int', nullable: true })
  stock: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  saleTax: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  purchaseTax: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  minPrice: number;

  @Column({ type: 'int', nullable: true })
  saleUnitId: number;

  @ManyToOne(() => UnitOfMeasure, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'saleUnitId' })
  saleUnitOfMeasure: UnitOfMeasure;

  @Column({ type: 'int', nullable: true })
  purchaseUnitId: number;

  @ManyToOne(() => UnitOfMeasure, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'purchaseUnitId' })
  purchaseUnitOfMeasure: UnitOfMeasure;

  @Column({ type: 'int', nullable: true })
  warehouseId: number;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @ManyToMany(() => Category, (category) => category.products)
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'productId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories: Category[];

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}
