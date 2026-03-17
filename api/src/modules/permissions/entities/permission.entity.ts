import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
    Index,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

@Entity('permissions')
@Index(['key'], { unique: true })
@Index(['module'])
export class Permission {
    @PrimaryGeneratedColumn()
    id: number;

    /** e.g. "invoices.create", "products.delete" */
    @Column({ type: 'varchar', length: 100, unique: true })
    key: string;

    /** Human-readable label */
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    /** Module group, e.g. "invoices", "products" */
    @Column({ type: 'varchar', length: 100 })
    module: string;

    /** e.g. "view" | "create" | "edit" | "delete" | "manage" */
    @Column({ type: 'varchar', length: 50 })
    action: string;

    @ManyToMany(() => Role, (role) => role.permissions)
    roles: Role[];

    @CreateDateColumn()
    dateCreated: Date;

    @UpdateDateColumn()
    dateUpdated: Date;
}
