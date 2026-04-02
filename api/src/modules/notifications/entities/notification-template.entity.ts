import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Centralized notification dictionary — stored per-tenant.
 * Admin can edit message templates from Backoffice settings.
 * Supports template variables like {{clientName}}, {{orderId}}, etc.
 */
@Entity('notification_templates')
@Index(['key'], { unique: true })
@Index(['category'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  /** Unique identifier for the notification type, e.g. CLIENT_REGISTERED */
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  /** Grouping category: clients | orders | delivery | stock | payments | system */
  @Column({ type: 'varchar', length: 50 })
  category: string;

  /** Which portal receives this notification: backoffice | client | delivery | all */
  @Column({ type: 'varchar', length: 50 })
  portal: string;

  @Column({ type: 'varchar', length: 255, name: 'title_fr' })
  titleFr: string;

  @Column({ type: 'text', name: 'body_fr' })
  bodyFr: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'title_ar' })
  titleAr: string | null;

  @Column({ type: 'text', nullable: true, name: 'body_ar' })
  bodyAr: string | null;

  /** Human-readable description of when this fires */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Whether this notification type is active */
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /** Notification priority: LOW | MEDIUM | HIGH | URGENT */
  @Column({ type: 'varchar', length: 20, default: 'MEDIUM' })
  priority: string;

  @CreateDateColumn({ name: 'date_created' })
  dateCreated: Date;

  @UpdateDateColumn({ name: 'date_updated' })
  dateUpdated: Date;
}
