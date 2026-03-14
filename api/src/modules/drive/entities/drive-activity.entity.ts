import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
    Index,
} from 'typeorm';
import { DriveNode } from './drive-node.entity';
import { DriveAction } from '../enums/drive-action.enum';

@Entity('drive_activity')
@Index(['nodeId'])
@Index(['actorId'])
@Index(['createdAt'])
export class DriveActivity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: DriveAction })
    action: DriveAction;

    @Column({ name: 'node_id', type: 'uuid', nullable: true })
    nodeId: string | null;

    @ManyToOne(() => DriveNode, (n) => n.activities, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'node_id' })
    node: DriveNode | null;

    /** Snapshot of the node name at the time of the action */
    @Column({ name: 'node_name', type: 'varchar', length: 512 })
    nodeName: string;

    @Column({ name: 'actor_id', type: 'int' })
    actorId: number;

    @Column({ name: 'target_user_id', type: 'int', nullable: true })
    targetUserId: number | null;

    @Column({ name: 'version_id', type: 'uuid', nullable: true })
    versionId: string | null;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, unknown>;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
