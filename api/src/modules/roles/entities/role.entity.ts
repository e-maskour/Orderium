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

    @ManyToMany(() => Permission, (perm) => perm.roles, { eager: true })
    @JoinTable({
        name: 'role_permissions',
        joinColumn: { name: 'roleId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
    })
    permissions: Permission[];

    @CreateDateColumn()
    dateCreated: Date;

    @UpdateDateColumn()
    dateUpdated: Date;
}
