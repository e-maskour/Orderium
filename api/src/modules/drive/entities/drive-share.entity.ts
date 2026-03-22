import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { DriveNode } from './drive-node.entity';
import { DrivePermission } from '../enums/drive-permission.enum';
import { DriveShareTarget } from '../enums/drive-share-target.enum';

@Entity('drive_shares')
@Unique(['nodeId', 'targetType', 'targetUserId'])
export class DriveShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'node_id', type: 'uuid' })
  nodeId: string;

  @ManyToOne(() => DriveNode, (n) => n.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'node_id' })
  node: DriveNode;

  @Column({
    type: 'enum',
    enum: DrivePermission,
    default: DrivePermission.VIEWER,
  })
  permission: DrivePermission;

  @Column({
    name: 'target_type',
    type: 'enum',
    enum: DriveShareTarget,
  })
  targetType: DriveShareTarget;

  @Column({ name: 'target_user_id', type: 'int', nullable: true })
  targetUserId: number | null;

  @Column({ name: 'shared_by', type: 'int' })
  sharedBy: number;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
