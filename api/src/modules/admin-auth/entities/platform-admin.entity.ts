import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type TwoFactorMethod = 'totp' | 'email';

/**
 * A super-admin account for the tenant dashboard. Lives in the master DB.
 *
 * Sign-in is three factors, in order:
 *   1. email + password
 *   2. second factor — authenticator app (TOTP) or a code e-mailed to the admin
 *   3. the platform `SUPER_ADMIN_API_KEY`
 *
 * Accounts are created from the CLI (`pnpm admin:create`), never over HTTP.
 */
@Entity('platform_admins')
export class PlatformAdmin {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  /** Enrolled second factor. `null` until the admin finishes enrolment. */
  @Column({ type: 'varchar', length: 10, nullable: true })
  twoFactorMethod: TwoFactorMethod | null;

  /** Method being enrolled (set during setup, cleared once verified). */
  @Column({ type: 'varchar', length: 10, nullable: true })
  pendingTwoFactorMethod: TwoFactorMethod | null;

  /** AES-256-GCM encrypted TOTP secret. */
  @Column({ type: 'text', nullable: true })
  totpSecretEnc: string | null;

  @Column({ type: 'text', nullable: true })
  totpPendingSecretEnc: string | null;

  /** Last accepted TOTP time-step — blocks replay of a code inside its window. */
  @Column({ type: 'int', nullable: true })
  lastTotpStep: number | null;

  /** SHA-256 of the current e-mail code. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  emailOtpHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailOtpExpiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailOtpSentAt: Date | null;

  /** Wrong second-factor codes since the last successful one. */
  @Column({ type: 'int', default: 0 })
  otpAttempts: number;

  /** Wrong passwords / API keys since the last successful sign-in. */
  @Column({ type: 'int', default: 0 })
  failedLoginCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  /** Bumped on logout / password change — invalidates every issued session. */
  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastLoginIp: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
