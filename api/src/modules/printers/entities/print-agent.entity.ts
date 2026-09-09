import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Warehouse } from '../../inventory/entities/warehouse.entity';

/**
 * A print agent is a small service running on a machine in one shop. It holds
 * an SSE connection to the API, claims print jobs for its warehouse, and talks
 * to the physical printers that the browser cannot reach.
 */
@Entity('print_agents')
@Index(['warehouseId', 'name'], { unique: true })
export class PrintAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ name: 'warehouse_id', type: 'int' })
  warehouseId: number;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  /** argon2id hash of the agent key. Never selected unless asked for. */
  @Column({ name: 'key_hash', type: 'text', nullable: true, select: false })
  keyHash: string | null;

  /** First 8 characters of the key, for display only. */
  @Column({ name: 'key_prefix', type: 'varchar', length: 8, nullable: true })
  keyPrefix: string | null;

  /** Single-use pairing code, cleared once exchanged for a key. */
  @Column({
    name: 'pairing_code',
    type: 'varchar',
    length: 40,
    nullable: true,
    select: false,
  })
  pairingCode: string | null;

  @Column({ name: 'pairing_expires_at', type: 'timestamptz', nullable: true })
  pairingExpiresAt: Date | null;

  /** Updated by the heartbeat; drives the online indicator. */
  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  version: string | null;

  /** win32 | linux | darwin, as reported by the agent. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  platform: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
