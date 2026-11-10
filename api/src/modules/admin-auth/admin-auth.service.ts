import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { authenticator as baseAuthenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import {
  PlatformAdmin,
  TwoFactorMethod,
} from './entities/platform-admin.entity';
import { AdminMailerService } from './admin-mailer.service';
import {
  decrypt,
  deriveKey,
  encrypt,
  maskEmail,
  safeEqual,
  sha256,
  sixDigitCode,
} from './admin-crypto';

// ─── Policy ──────────────────────────────────────────────────────────────────
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;
const EMAIL_CODE_TTL_MIN = 10;
const EMAIL_RESEND_COOLDOWN_S = 60;
const SESSION_TTL = '8h';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const ISSUER = 'Marnova Admin';

/** Precomputed hash so unknown e-mails cost the same bcrypt time as real ones. */
const DUMMY_HASH =
  '$2b$12$D/IRmMZVtHk.42nzqsxz1.Hxn9HcmMlTawTT.P7gXRht67285mhru';

/** "Remember this device" lifetime, for both the 2FA skip and the API-key grant. */
const TRUST_TTL = '30d';
export const TRUST_TTL_DAYS = 30;

type Stage = '2fa';
const AUD_CHALLENGE = 'marnova-admin-challenge';
const AUD_SESSION = 'marnova-admin-session';
const AUD_DEVICE = 'marnova-admin-device';
const AUD_KEY_GRANT = 'marnova-admin-key-grant';

interface ChallengePayload {
  sub: number;
  stage: Stage;
}
interface SessionPayload {
  sub: number;
  email: string;
  ver: number;
}
/** Trusted browser: skips the 2FA step. `fp` dies with a password or 2FA change. */
interface DevicePayload {
  sub: number;
  fp: string;
}
/** Remembered API key: `kfp` dies when SUPER_ADMIN_API_KEY is rotated. */
interface KeyGrantPayload {
  sub: number;
  kfp: string;
}

export interface SessionResult {
  accessToken: string;
  expiresIn: number;
  admin: AuthenticatedAdmin;
}

export type LoginStep =
  | { step: 'enroll'; challengeToken: string }
  | { step: 'totp'; challengeToken: string }
  | { step: 'email'; challengeToken: string; sentTo: string }
  | ({ step: 'signed-in' } & SessionResult);

export interface AuthenticatedAdmin {
  id: number;
  email: string;
  name: string | null;
  twoFactorMethod: TwoFactorMethod | null;
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly totp = baseAuthenticator.clone({ window: 1 });
  private jwtInstance: JwtService | null = null;

  constructor(
    @InjectRepository(PlatformAdmin, 'master')
    private readonly repo: Repository<PlatformAdmin>,
    private readonly config: ConfigService,
    private readonly mailer: AdminMailerService,
  ) {}

  // ─── Secrets ───────────────────────────────────────────────────────────────

  private get secret(): string {
    const s = this.config.get<string>('ADMIN_AUTH_SECRET');
    if (!s || s.length < 32) {
      throw new InternalServerErrorException(
        'ADMIN_AUTH_SECRET is missing or shorter than 32 characters',
      );
    }
    return s;
  }

  private get jwt(): JwtService {
    this.jwtInstance ??= new JwtService({ secret: this.secret });
    return this.jwtInstance;
  }

  private get totpKey(): Buffer {
    return deriveKey(this.secret, 'totp-secret');
  }

  // ─── Step 1: email + password ─────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    deviceToken?: string,
    ip?: string,
  ): Promise<LoginStep> {
    const admin = await this.repo.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!admin || !admin.isActive) {
      await bcrypt.compare(password, DUMMY_HASH); // equalise timing
      throw new UnauthorizedException('Invalid email or password');
    }
    this.assertNotLocked(admin);

    if (!(await bcrypt.compare(password, admin.passwordHash))) {
      await this.registerFailure(admin);
      throw new UnauthorizedException('Invalid email or password');
    }

    admin.failedLoginCount = 0;
    admin.otpAttempts = 0;
    await this.repo.save(admin);

    // A browser trusted at a previous sign-in skips the second factor
    // (the password above is still required).
    if (deviceToken && (await this.isTrustedDevice(admin, deviceToken))) {
      return { step: 'signed-in', ...(await this.issueSession(admin, ip)) };
    }

    const challengeToken = await this.signChallenge(admin.id, '2fa');

    if (!admin.twoFactorMethod) return { step: 'enroll', challengeToken };
    if (admin.twoFactorMethod === 'totp')
      return { step: 'totp', challengeToken };

    await this.sendEmailCode(admin);
    return { step: 'email', challengeToken, sentTo: maskEmail(admin.email) };
  }

  // ─── Step 2a: first-time 2FA enrolment ────────────────────────────────────

  async setupTwoFactor(challengeToken: string, method: TwoFactorMethod) {
    const admin = await this.adminFromChallenge(challengeToken, '2fa');
    if (admin.twoFactorMethod) {
      throw new BadRequestException(
        'Two-factor authentication is already set up for this account',
      );
    }

    admin.pendingTwoFactorMethod = method;

    if (method === 'totp') {
      const secret = this.totp.generateSecret();
      admin.totpPendingSecretEnc = encrypt(secret, this.totpKey);
      await this.repo.save(admin);
      const otpauthUrl = this.totp.keyuri(admin.email, ISSUER, secret);
      return {
        method,
        secret,
        otpauthUrl,
        qrCodeDataUrl: await toDataURL(otpauthUrl, { margin: 1, width: 220 }),
      };
    }

    admin.totpPendingSecretEnc = null;
    await this.repo.save(admin);
    await this.sendEmailCode(admin);
    return { method, sentTo: maskEmail(admin.email) };
  }

  async resendEmailCode(challengeToken: string) {
    const admin = await this.adminFromChallenge(challengeToken, '2fa');
    const method = admin.twoFactorMethod ?? admin.pendingTwoFactorMethod;
    if (method !== 'email') {
      throw new BadRequestException(
        'E-mail codes are not used for this account',
      );
    }
    if (
      admin.emailOtpSentAt &&
      Date.now() - admin.emailOtpSentAt.getTime() <
        EMAIL_RESEND_COOLDOWN_S * 1000
    ) {
      throw new HttpException(
        `Wait ${EMAIL_RESEND_COOLDOWN_S} seconds before requesting another code`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.sendEmailCode(admin);
    return { sentTo: maskEmail(admin.email) };
  }

  // ─── Step 2b: verify the second factor ────────────────────────────────────

  async verifyTwoFactor(
    challengeToken: string,
    code: string,
    ip?: string,
    rememberDevice = false,
  ): Promise<SessionResult & { deviceToken?: string }> {
    const admin = await this.adminFromChallenge(challengeToken, '2fa');
    this.assertNotLocked(admin);

    const enrolling = !admin.twoFactorMethod;
    const method = admin.twoFactorMethod ?? admin.pendingTwoFactorMethod;
    if (!method) {
      throw new BadRequestException('Choose a two-factor method first');
    }

    if (admin.otpAttempts >= MAX_OTP_ATTEMPTS) {
      await this.burnOtpAndLock(admin);
    }

    const ok =
      method === 'totp'
        ? this.checkTotp(admin, code, enrolling)
        : this.checkEmailCode(admin, code);

    if (!ok) {
      admin.otpAttempts += 1;
      await this.repo.save(admin);
      if (admin.otpAttempts >= MAX_OTP_ATTEMPTS)
        await this.burnOtpAndLock(admin);
      throw new UnauthorizedException('Invalid or expired code');
    }

    if (enrolling) {
      admin.twoFactorMethod = method;
      if (method === 'totp') admin.totpSecretEnc = admin.totpPendingSecretEnc;
      this.logger.log(`Admin ${admin.email} enrolled 2FA (${method})`);
    }
    admin.pendingTwoFactorMethod = null;
    admin.totpPendingSecretEnc = null;
    admin.emailOtpHash = null;
    admin.emailOtpExpiresAt = null;
    admin.otpAttempts = 0;
    await this.repo.save(admin);

    const session = await this.issueSession(admin, ip);
    if (!rememberDevice) return session;
    return { ...session, deviceToken: await this.signDeviceToken(admin) };
  }

  private async issueSession(
    admin: PlatformAdmin,
    ip?: string,
  ): Promise<SessionResult> {
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = ip?.slice(0, 64) ?? null;
    await this.repo.save(admin);
    this.logger.log(`Admin ${admin.email} signed in`);

    const payload: SessionPayload = {
      sub: admin.id,
      email: admin.email,
      ver: admin.tokenVersion,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      audience: AUD_SESSION,
      expiresIn: SESSION_TTL,
    });
    return {
      accessToken,
      expiresIn: SESSION_TTL_SECONDS,
      admin: this.toPublic(admin),
    };
  }

  // ─── Platform API key (entered after sign-in, from the dashboard header) ───

  /**
   * Checks the platform API key for a signed-in admin. Wrong keys count
   * toward the account lockout; reaching it also revokes every session.
   */
  async verifyApiKey(
    adminId: number,
    apiKey: string,
    remember = false,
  ): Promise<{ valid: true; grant?: string }> {
    const admin = await this.repo.findOne({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException('Account unavailable');
    this.assertNotLocked(admin);

    const expected = this.expectedApiKey();
    if (!safeEqual(apiKey.trim(), expected)) {
      await this.registerFailure(admin);
      throw new ForbiddenException('Invalid super-admin API key');
    }
    if (admin.failedLoginCount) {
      admin.failedLoginCount = 0;
      await this.repo.save(admin);
    }
    if (!remember) return { valid: true };

    // The browser keeps this signed grant instead of the raw key.
    const payload: KeyGrantPayload = { sub: admin.id, kfp: this.keyFingerprint(expected) };
    const grant = await this.jwt.signAsync(payload, {
      audience: AUD_KEY_GRANT,
      expiresIn: TRUST_TTL,
    });
    return { valid: true, grant };
  }

  /**
   * True when `grant` was issued to this admin for the current platform key.
   * Used by SuperAdminGuard in place of the raw `X-Super-Admin-Key` header.
   */
  async isValidApiKeyGrant(adminId: number, grant: string): Promise<boolean> {
    try {
      const payload = await this.jwt.verifyAsync<KeyGrantPayload>(grant, {
        audience: AUD_KEY_GRANT,
      });
      return (
        payload.sub === adminId &&
        safeEqual(payload.kfp, this.keyFingerprint(this.expectedApiKey()))
      );
    } catch {
      return false;
    }
  }

  private expectedApiKey(): string {
    const expected = this.config.get<string>('SUPER_ADMIN_API_KEY');
    if (!expected) {
      throw new InternalServerErrorException(
        'SUPER_ADMIN_API_KEY is not configured on the server',
      );
    }
    return expected;
  }

  private keyFingerprint(key: string): string {
    return sha256(`api-key|${key}`).slice(0, 32);
  }

  // ─── Trusted devices (skip 2FA) ──────────────────────────────────────────

  /** Changes whenever the password or the second factor changes. */
  private deviceFingerprint(admin: PlatformAdmin): string {
    return sha256(
      `device|${admin.passwordHash}|${admin.twoFactorMethod ?? ''}|${admin.totpSecretEnc ?? ''}`,
    ).slice(0, 32);
  }

  private signDeviceToken(admin: PlatformAdmin): Promise<string> {
    const payload: DevicePayload = { sub: admin.id, fp: this.deviceFingerprint(admin) };
    return this.jwt.signAsync(payload, { audience: AUD_DEVICE, expiresIn: TRUST_TTL });
  }

  private async isTrustedDevice(
    admin: PlatformAdmin,
    token: string,
  ): Promise<boolean> {
    if (!admin.twoFactorMethod) return false; // must have enrolled 2FA first
    try {
      const payload = await this.jwt.verifyAsync<DevicePayload>(token, {
        audience: AUD_DEVICE,
      });
      return (
        payload.sub === admin.id &&
        safeEqual(payload.fp, this.deviceFingerprint(admin))
      );
    } catch {
      return false;
    }
  }

  // ─── Session (used by SuperAdminGuard) ────────────────────────────────────

  async validateSession(token: string): Promise<AuthenticatedAdmin> {
    let payload: SessionPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionPayload>(token, {
        audience: AUD_SESSION,
      });
    } catch {
      throw new UnauthorizedException('Session expired — sign in again');
    }
    const admin = await this.repo.findOne({ where: { id: payload.sub } });
    if (!admin || !admin.isActive || admin.tokenVersion !== payload.ver) {
      throw new UnauthorizedException('Session revoked — sign in again');
    }
    return this.toPublic(admin);
  }

  /** Invalidates every session of this admin (all devices). */
  async logout(adminId: number) {
    await this.repo.increment({ id: adminId }, 'tokenVersion', 1);
  }

  /**
   * Re-authentication for destructive operations. 403 (not 401) on a wrong
   * password so a typo does not sign the dashboard out.
   */
  async assertPassword(adminId: number, password: string | undefined) {
    const admin = await this.repo.findOne({ where: { id: adminId } });
    if (
      !admin ||
      !password ||
      !(await bcrypt.compare(password, admin.passwordHash))
    ) {
      throw new ForbiddenException('Incorrect password');
    }
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private toPublic(admin: PlatformAdmin): AuthenticatedAdmin {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      twoFactorMethod: admin.twoFactorMethod,
    };
  }

  private signChallenge(id: number, stage: Stage): Promise<string> {
    const payload: ChallengePayload = { sub: id, stage };
    return this.jwt.signAsync(payload, {
      audience: AUD_CHALLENGE,
      expiresIn: '10m',
    });
  }

  private async adminFromChallenge(
    token: string,
    stage: Stage,
  ): Promise<PlatformAdmin> {
    let payload: ChallengePayload;
    try {
      payload = await this.jwt.verifyAsync<ChallengePayload>(token, {
        audience: AUD_CHALLENGE,
      });
    } catch {
      throw new UnauthorizedException('Sign-in step expired — start again');
    }
    if (payload.stage !== stage) {
      throw new UnauthorizedException('Invalid sign-in step');
    }
    const admin = await this.repo.findOne({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Account unavailable');
    }
    return admin;
  }

  private assertNotLocked(admin: PlatformAdmin) {
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const mins = Math.ceil(
        (admin.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new HttpException(
        `Account locked after too many failed attempts. Try again in ${mins} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async registerFailure(admin: PlatformAdmin) {
    admin.failedLoginCount += 1;
    if (admin.failedLoginCount >= MAX_FAILED_LOGINS) {
      admin.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      admin.failedLoginCount = 0;
      admin.tokenVersion += 1; // sign out every session
      this.logger.warn(`Admin ${admin.email} locked for ${LOCK_MINUTES} min`);
    }
    await this.repo.save(admin);
  }

  private async burnOtpAndLock(admin: PlatformAdmin): Promise<never> {
    admin.emailOtpHash = null;
    admin.emailOtpExpiresAt = null;
    admin.otpAttempts = 0;
    admin.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
    await this.repo.save(admin);
    this.logger.warn(`Admin ${admin.email} locked: too many wrong 2FA codes`);
    throw new HttpException(
      `Too many wrong codes. Account locked for ${LOCK_MINUTES} minutes.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private checkTotp(admin: PlatformAdmin, code: string, enrolling: boolean) {
    const enc = enrolling ? admin.totpPendingSecretEnc : admin.totpSecretEnc;
    if (!enc) return false;
    const delta = this.totp.checkDelta(code, decrypt(enc, this.totpKey));
    if (delta === null) return false;
    const step = Math.floor(Date.now() / 30000) + delta;
    if (admin.lastTotpStep !== null && step <= admin.lastTotpStep) return false; // replay
    admin.lastTotpStep = step;
    return true;
  }

  private checkEmailCode(admin: PlatformAdmin, code: string) {
    if (
      !admin.emailOtpHash ||
      !admin.emailOtpExpiresAt ||
      admin.emailOtpExpiresAt < new Date()
    ) {
      return false;
    }
    return safeEqual(sha256(code), admin.emailOtpHash);
  }

  private async sendEmailCode(admin: PlatformAdmin) {
    const code = sixDigitCode();
    admin.emailOtpHash = sha256(code);
    admin.emailOtpExpiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MIN * 60000);
    admin.emailOtpSentAt = new Date();
    admin.otpAttempts = 0;
    await this.repo.save(admin);
    await this.mailer.sendLoginCode(admin.email, code, EMAIL_CODE_TTL_MIN);
  }
}
