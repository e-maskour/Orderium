import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { DriveNode } from './drive-node.entity';

@Entity('drive_versions')
@Index(['nodeId'])
@Unique(['nodeId', 'versionNumber'])
export class DriveVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'node_id', type: 'uuid' })
  nodeId: string;

  @ManyToOne(() => DriveNode, (n) => n.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'node_id' })
  node: DriveNode;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column({ name: 'storage_key', type: 'varchar', length: 1024 })
  storageKey: string;

  @Column({ name: 'storage_bucket', type: 'varchar', length: 255 })
  storageBucket: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType: string;

  @Column({ name: 'original_name', type: 'varchar', length: 512 })
  originalName: string;

  @Column({
    name: 'checksum_sha256',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  checksumSha256: string | null;

  @Column({ name: 'uploaded_by', type: 'int' })
  uploadedBy: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
