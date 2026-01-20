import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Partner } from '../../partners/entities/partner.entity';
import { DeliveryPerson } from '../../delivery/entities/delivery.entity';

@Entity('portal')
@Index(['phoneNumber'])
export class Portal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'boolean', default: false })
  isAdmin: boolean;

  @Column({ type: 'boolean', default: false })
  isCustomer: boolean;

  @Column({ type: 'boolean', default: false })
  isDelivery: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;

  @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: Partner;

  @Column({ type: 'int', nullable: true })
  customerId: number | null;

  @ManyToOne(() => DeliveryPerson, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deliveryId' })
  deliveryPerson: DeliveryPerson;

  @Column({ type: 'int', nullable: true })
  deliveryId: number | null;
}
