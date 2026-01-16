import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('partners')
@Index(['phoneNumber'])
@Index(['email'])
export class Partner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ice: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  if: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cnss: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  rc: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  patente: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tvaNumber: string;

  @Column({ type: 'text', nullable: true })
  deliveryAddress: string;

  @Column({ type: 'boolean', default: false })
  isCompany: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  googleMapsUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  wazeUrl: string;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  isCustomer: boolean;

  @Column({ type: 'boolean', default: false })
  isSupplier: boolean;

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}
