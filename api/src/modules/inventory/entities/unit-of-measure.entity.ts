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

@Entity('unit_of_measures')
@Index(['name'])
@Index(['category'])
export class UnitOfMeasure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  category: string; // Weight, Volume, Length, Unit, etc.

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 1 })
  ratio: number; // Conversion ratio to base unit

  @Column({ type: 'varchar', length: 10, nullable: true })
  roundingPrecision: string; // 0.01, 0.001, 1, etc.

  @Column({ type: 'boolean', default: false })
  isBaseUnit: boolean; // True if this is the reference unit for the category

  @ManyToOne(() => UnitOfMeasure, { nullable: true })
  @JoinColumn({ name: 'baseUnitId' })
  baseUnit: UnitOfMeasure;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}
