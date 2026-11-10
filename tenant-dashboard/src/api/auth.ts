import { apiClient } from './client';

export type TwoFactorMethod = 'totp' | 'email';

export type LoginStep =
  | { step: 'enroll'; challengeToken: string }
  | { step: 'totp'; challengeToken: string }
  | { step: 'email'; challengeToken: string; sentTo: string }
  /** The browser was trusted at a previous sign-in: no code needed. */
  | ({ step: 'signed-in' } & SignedIn);

export type TwoFactorSetup =
  | { method: 'totp'; secret: string; otpauthUrl: string; qrCodeDataUrl: string }
  | { method: 'email'; sentTo: string };

export interface AdminProfile {
  id: number;
  email: string;
  name: string | null;
  twoFactorMethod: TwoFactorMethod | null;
}

export interface SignedIn {
  accessToken: string;
  expiresIn: number;
  admin: AdminProfile;
}

export const authApi = {
  /** `deviceToken` (from a previous "remember this device") skips the 2FA step while valid. */
  login: async (email: string, password: string, deviceToken?: string | null): Promise<LoginStep> => {
    const { data } = await apiClient.post('/admin/auth/login', {
      email,
      password,
      ...(deviceToken ? { deviceToken } : {}),
    });
    return data;
  },

  setupTwoFactor: async (
    challengeToken: string,
    method: TwoFactorMethod,
  ): Promise<TwoFactorSetup> => {
    const { data } = await apiClient.post('/admin/auth/2fa/setup', { challengeToken, method });
    return data;
  },

  resendEmailCode: async (challengeToken: string): Promise<{ sentTo: string }> => {
    const { data } = await apiClient.post('/admin/auth/2fa/resend', { challengeToken });
    return data;
  },

  /** Verifies the 2FA code and returns the session (+ a device token when remembering). */
  verifyCode: async (
    challengeToken: string,
    code: string,
    rememberDevice = false,
  ): Promise<SignedIn & { deviceToken?: string }> => {
    const { data } = await apiClient.post('/admin/auth/2fa/verify', {
      challengeToken,
      code,
      rememberDevice,
    });
    return data;
  },

  /** Checks the platform API key (403 if wrong); `remember` returns a 30-day grant. */
  verifyApiKey: async (
    apiKey: string,
    remember = false,
  ): Promise<{ valid: true; grant?: string }> => {
    const { data } = await apiClient.post('/admin/auth/api-key/verify', { apiKey, remember });
    return data;
  },

  me: async (): Promise<AdminProfile> => {
    const { data } = await apiClient.get('/admin/auth/me');
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/admin/auth/logout', {});
  },
};
