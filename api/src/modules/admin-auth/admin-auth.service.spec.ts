import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AdminAuthService } from './admin-auth.service';
import type { PlatformAdmin } from './entities/platform-admin.entity';
import type { AdminMailerService } from './admin-mailer.service';

const SECRET = 'x'.repeat(40);
const API_KEY = 'sk_admin_test_key';
const PASSWORD = 'Correct-horse-1';

function setup(apiKey = API_KEY) {
  const admin = {
    id: 7,
    email: 'admin@example.com',
    name: 'Admin',
    isActive: true,
    passwordHash: bcrypt.hashSync(PASSWORD, 4),
    twoFactorMethod: 'email',
    totpSecretEnc: null,
    failedLoginCount: 0,
    otpAttempts: 0,
    lockedUntil: null,
    tokenVersion: 1,
    emailOtpHash: null,
    emailOtpExpiresAt: null,
    emailOtpSentAt: null,
  } as unknown as PlatformAdmin;

  const repo = {
    findOne: jest.fn(() => Promise.resolve(admin)),
    save: jest.fn((a: PlatformAdmin) => Promise.resolve(a)),
  };
  const env: Record<string, string> = {
    ADMIN_AUTH_SECRET: SECRET,
    SUPER_ADMIN_API_KEY: apiKey,
  };
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  const sendLoginCode = jest.fn();
  const mailer = { sendLoginCode } as unknown as AdminMailerService;

  const service = new AdminAuthService(repo as never, config, mailer);
  return { service, admin, env, mailer, sendLoginCode };
}

/** Signs in with an e-mail code and returns the verify response. */
async function signInWithCode(
  s: ReturnType<typeof setup>,
  rememberDevice: boolean,
) {
  let sentCode = '';
  s.sendLoginCode.mockImplementation((_e: string, code: string) => {
    sentCode = code;
    return Promise.resolve();
  });
  const step = await s.service.login(s.admin.email, PASSWORD);
  if (step.step !== 'email') throw new Error(`unexpected step ${step.step}`);
  return s.service.verifyTwoFactor(
    step.challengeToken,
    sentCode,
    '127.0.0.1',
    rememberDevice,
  );
}

describe('AdminAuthService — remember this device', () => {
  it('returns no device token unless asked', async () => {
    const s = setup();
    const res = await signInWithCode(s, false);
    expect(res.accessToken).toBeTruthy();
    expect(res.deviceToken).toBeUndefined();
  });

  it('skips the 2FA step for a trusted device, but still checks the password', async () => {
    const s = setup();
    const { deviceToken } = await signInWithCode(s, true);
    expect(deviceToken).toBeTruthy();
    s.sendLoginCode.mockClear();

    const next = await s.service.login(s.admin.email, PASSWORD, deviceToken);
    expect(next.step).toBe('signed-in');
    expect(s.sendLoginCode).not.toHaveBeenCalled();

    await expect(
      s.service.login(s.admin.email, 'wrong', deviceToken),
    ).rejects.toThrow('Invalid email or password');
  });

  it('stops trusting the device after a password change', async () => {
    const s = setup();
    const { deviceToken } = await signInWithCode(s, true);
    s.admin.passwordHash = bcrypt.hashSync('New-password-2', 4);

    const next = await s.service.login(
      s.admin.email,
      'New-password-2',
      deviceToken,
    );
    expect(next.step).toBe('email');
  });

  it('ignores a device token issued to another admin', async () => {
    const s = setup();
    const { deviceToken } = await signInWithCode(s, true);
    s.admin.id = 8;

    const next = await s.service.login(s.admin.email, PASSWORD, deviceToken);
    expect(next.step).toBe('email');
  });
});

describe('AdminAuthService — remembered API key', () => {
  it('issues a grant only when asked, valid for the same admin', async () => {
    const s = setup();
    expect((await s.service.verifyApiKey(7, API_KEY)).grant).toBeUndefined();

    const { grant } = await s.service.verifyApiKey(7, API_KEY, true);
    expect(grant).toBeTruthy();
    await expect(s.service.isValidApiKeyGrant(7, grant!)).resolves.toBe(true);
    await expect(s.service.isValidApiKeyGrant(8, grant!)).resolves.toBe(false);
    await expect(s.service.isValidApiKeyGrant(7, 'not-a-token')).resolves.toBe(
      false,
    );
  });

  it('rejects grants after the platform key is rotated', async () => {
    const s = setup();
    const { grant } = await s.service.verifyApiKey(7, API_KEY, true);
    s.env.SUPER_ADMIN_API_KEY = 'sk_admin_rotated';
    await expect(s.service.isValidApiKeyGrant(7, grant!)).resolves.toBe(false);
  });

  it('does not issue a grant for a wrong key', async () => {
    const s = setup();
    await expect(s.service.verifyApiKey(7, 'wrong', true)).rejects.toThrow(
      'Invalid super-admin API key',
    );
  });
});
