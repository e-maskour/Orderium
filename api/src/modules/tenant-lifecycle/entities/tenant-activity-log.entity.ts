import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Tenant } from '../../tenant/tenant.entity';

@Entity('tenant_activity_log')
export class TenantActivityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'int' })
    tenantId: number;

    @ManyToOne(() => Tenant, (t) => t.activityLogs, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({ type: 'varchar', length: 50 })
    action: string;

    @Column({ type: 'jsonb', default: '{}' })
    details: Record<string, unknown>;

    @Column({ type: 'varchar', length: 100, nullable: true })
    performedBy: string | null;

    @CreateDateColumn()
    createdAt: Date;
}
