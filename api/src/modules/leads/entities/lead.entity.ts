import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'won',
  'lost',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** How the visitor chose to continue after submitting the landing form. */
export const LEAD_CHANNELS = ['whatsapp', 'email'] as const;
export type LeadChannel = (typeof LEAD_CHANNELS)[number];

/**
 * A prospect captured by the marketing landing page. Platform-level data:
 * lives in the master database, managed from the tenant dashboard.
 */
@Entity('leads')
@Index(['status', 'createdAt'])
@Index(['phone'])
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  company: string | null;

  /** As typed by the visitor (Moroccan numbers come in many shapes). */
  @Column({ length: 40 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  activity: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'varchar', length: 8, default: 'fr' })
  locale: string;

  @Column({ type: 'varchar', length: 16, default: 'whatsapp' })
  channel: LeadChannel;

  @Column({ type: 'varchar', length: 16, default: 'new' })
  status: LeadStatus;

  /** Super-admin follow-up notes. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ── Attribution ──────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 120, nullable: true })
  utmSource: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  utmMedium: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  utmCampaign: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  utmTerm: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  utmContent: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  landingPath: string | null;

  // ── Abuse control (no raw IP is stored) ───────────────────────────────────
  @Column({ type: 'varchar', length: 64, nullable: true })
  ipHash: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  userAgent: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  contactedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
