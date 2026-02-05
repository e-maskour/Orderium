import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Portal } from '../../portal/entities/portal.entity';

@Entity('notifications')
@Index(['userId'])
@Index(['isRead'])
@Index(['dateCreated'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Portal, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Portal;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, default: 'MEDIUM' })
  priority: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn()
  dateCreated: Date;
}
