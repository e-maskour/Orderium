import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
@Index(['name'])
@Index(['type'])
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'product',
  })
  type: string; // 'product', 'customer', 'supplier', etc.

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Self-referential relationship for parent
  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Category;

  @Column({ type: 'int', nullable: true })
  parentId: number;

  // Self-referential relationship for children
  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  // Many-to-many with products
  @ManyToMany(() => Product, (product) => product.categories)
  products: Product[];

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}
