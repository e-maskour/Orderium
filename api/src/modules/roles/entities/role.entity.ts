import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';

/**
 * An access group, equivalent to Odoo's `res.groups`.
 *
 * A role holds an explicit set of permissions and may *imply* other roles:
 * "Sales Manager" implies "Sales User" implies "Sales Read". A user's effective
 * rights are the union of every role they hold plus the transitive closure of
 * everything those roles imply — see `AccessControlService`.
 */
@Entity('roles')
@Index(['name'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Super admin bypasses all permission checks */
  @Column({ type: 'boolean', default: false })
  isSuperAdmin: boolean;

  /**
   * Seeded preset role. System roles cannot be renamed or deleted, mirroring
   * Odoo's data-defined groups. Their permission set stays editable.
   */
  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  /** Registry category this role primarily belongs to, for grouping in the UI. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @ManyToMany(() => Permission, (perm) => perm.roles, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  /** Roles whose permissions this role also grants (Odoo `implied_ids`). */
  @ManyToMany(() => Role, (role) => role.impliedBy)
  @JoinTable({
    name: 'role_implications',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'impliedRoleId', referencedColumnName: 'id' },
  })
  implies: Role[];

  /** Inverse side of `implies`. */
  @ManyToMany(() => Role, (role) => role.implies)
  impliedBy: Role[];

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}
