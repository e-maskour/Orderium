/**
 * Manage tenant-dashboard super-admin accounts (master DB).
 *
 *   pnpm admin:create --email you@example.com [--name "Your Name"]
 *   pnpm admin:create --email you@example.com --reset-password
 *   pnpm admin:create --email you@example.com --reset-2fa
 *   pnpm admin:create --email you@example.com --disable | --enable
 *   pnpm admin:create --list
 *
 * The password is prompted (hidden). For non-interactive use set ADMIN_PASSWORD.
 * Two-factor authentication is enrolled on the admin's first sign-in.
 */

import * as bcrypt from 'bcrypt';
import { MasterDataSource } from '../database/master-data-source';
import { PlatformAdmin } from '../modules/admin-auth/entities/platform-admin.entity';

const MIN_PASSWORD = 12;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : '';
}
const has = (name: string) => process.argv.includes(`--${name}`);

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch: string) => {
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') {
        process.stdout.write('\n');
        process.exit(130);
      } else if (ch === '\u007f' || ch === '\b') {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function askPassword(): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD;
  const pw = fromEnv ?? (await promptHidden('Password: '));
  if (pw.length < MIN_PASSWORD) {
    throw new Error(`Password must be at least ${MIN_PASSWORD} characters`);
  }
  if (!fromEnv && (await promptHidden('Confirm password: ')) !== pw) {
    throw new Error('Passwords do not match');
  }
  return bcrypt.hash(pw, 12);
}

async function main() {
  await MasterDataSource.initialize();
  const repo = MasterDataSource.getRepository(PlatformAdmin);

  if (has('list')) {
    const admins = await repo.find({ order: { id: 'ASC' } });
    console.table(
      admins.map((a) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        twoFactor: a.twoFactorMethod ?? '(not enrolled)',
        active: a.isActive,
        lastLogin: a.lastLoginAt?.toISOString() ?? '-',
      })),
    );
    return;
  }

  const email = arg('email')?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Provide a valid --email');
  }
  const existing = await repo.findOne({ where: { email } });

  if (
    has('reset-password') ||
    has('reset-2fa') ||
    has('disable') ||
    has('enable')
  ) {
    if (!existing) throw new Error(`No admin with email ${email}`);
    if (has('reset-password')) existing.passwordHash = await askPassword();
    if (has('reset-2fa')) {
      existing.twoFactorMethod = null;
      existing.pendingTwoFactorMethod = null;
      existing.totpSecretEnc = null;
      existing.totpPendingSecretEnc = null;
      existing.lastTotpStep = null;
    }
    if (has('disable')) existing.isActive = false;
    if (has('enable')) existing.isActive = true;
    existing.failedLoginCount = 0;
    existing.otpAttempts = 0;
    existing.lockedUntil = null;
    existing.tokenVersion += 1; // sign out every session
    await repo.save(existing);
    console.log(`Updated ${email}. All existing sessions were signed out.`);
    return;
  }

  if (existing) {
    throw new Error(
      `Admin ${email} already exists (use --reset-password or --reset-2fa)`,
    );
  }
  const admin = repo.create({
    email,
    name: arg('name') || null,
    passwordHash: await askPassword(),
  });
  await repo.save(admin);
  console.log(
    `Created admin ${email}. Two-factor authentication will be set up on first sign-in.`,
  );
}

main()
  .catch((err: Error) => {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    if (MasterDataSource.isInitialized) void MasterDataSource.destroy();
  });
