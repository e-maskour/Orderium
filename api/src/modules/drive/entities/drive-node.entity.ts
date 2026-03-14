import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    Index,
} from 'typeorm';
import { DriveNodeType } from '../enums/drive-node-type.enum';
import { DriveVersion } from './drive-version.entity';
import { DriveShare } from './drive-share.entity';
import { DriveActivity } from './drive-activity.entity';
import { DriveNodeTag } from './drive-node-tag.entity';

@Entity('drive_nodes')
@Index(['parentId'])
@Index(['ownerId'])
@Index(['type'])
@Index(['isTrashed'])
export class DriveNode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 6 })
    type: DriveNodeType;

    @Column({ type: 'varchar', length: 512 })
    name: string;

    @Column({ name: 'parent_id', type: 'uuid', nullable: true })
    parentId: string | null;

    @ManyToOne(() => DriveNode, (node) => node.children, {
        nullable: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'parent_id' })
    parent: DriveNode;

    @OneToMany(() => DriveNode, (node) => node.parent)
    children: DriveNode[];

    @Column({ name: 'owner_id', type: 'int' })
    ownerId: number;

    // ── File-only fields ────────────────────────────────────────────
    @Column({ name: 'mime_type', type: 'varchar', length: 255, nullable: true })
    mimeType: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    extension: string | null;

    @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
    sizeBytes: number | null;

    @Column({ name: 'storage_key', type: 'varchar', length: 1024, nullable: true })
    storageKey: string | null;

    @Column({
        name: 'storage_bucket',
        type: 'varchar',
        length: 255,
        default: 'orderium-drive',
    })
    storageBucket: string;

    @Column({ name: 'active_version_id', type: 'uuid', nullable: true })
    activeVersionId: string | null;

    // ── Metadata ────────────────────────────────────────────────────
    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ name: 'is_starred', type: 'boolean', default: false })
    isStarred: boolean;

    @Column({ name: 'is_trashed', type: 'boolean', default: false })
    isTrashed: boolean;

    @Column({ name: 'trashed_at', type: 'timestamptz', nullable: true })
    trashedAt: Date | null;

    @Column({ name: 'created_by', type: 'int', nullable: true })
    createdBy: number | null;

    @Column({ name: 'updated_by', type: 'int', nullable: true })
    updatedBy: number | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    // ── Relations ───────────────────────────────────────────────────
    @OneToMany(() => DriveVersion, (v) => v.node)
    versions: DriveVersion[];

    @OneToMany(() => DriveShare, (s) => s.node)
    shares: DriveShare[];

    @OneToMany(() => DriveActivity, (a) => a.node)
    activities: DriveActivity[];

    @OneToMany(() => DriveNodeTag, (nt) => nt.node)
    nodeTags: DriveNodeTag[];
}
