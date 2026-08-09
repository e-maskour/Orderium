import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { Partner } from '../../partners/entities/partner.entity';
import { Role } from '../../roles/entities/role.entity';

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

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;

  @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: Partner;

  @Column({ type: 'int', nullable: true })
  customerId: number | null;

  /** User type discriminator: 'admin' = backoffice user, 'client' = portal client */
  @Column({ type: 'varchar', length: 20, default: 'client' })
  userType: 'admin' | 'client';

  /** Avatar image URL */
  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  /**
   * @deprecated Superseded by the many-to-many `roles` relation below, which
   * mirrors Odoo's `res.users.groups_id`. Backfilled into `user_roles` by the
   * access-control migration and kept for one release so that any straggling
   * reader keeps working. Do not write to it.
   */
  @Column({ type: 'int', nullable: true })
  roleId: number | null;

  /** @deprecated See `roleId`. */
  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'roleId' })
  role: Role | null;

  /** Access groups held by this user. Effective rights are their union. */
  @ManyToMany(() => Role, { eager: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];
}
