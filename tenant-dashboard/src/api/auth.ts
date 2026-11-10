import { apiClient } from './client';

export type TwoFactorMethod = 'totp' | 'email';

export type LoginStep =
  | { step: 'enroll'; challengeToken: string }
  | { step: 'totp'; challengeToken: string }
  | { step: 'email'; challengeToken: string; sentTo: string };

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
  login: async (email: string, password: string): Promise<LoginStep> => {
    const { data } = await apiClient.post('/admin/auth/login', { email, password });
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

  /** Verifies the 2FA code and returns the session. */
  verifyCode: async (challengeToken: string, code: string): Promise<SignedIn> => {
    const { data } = await apiClient.post('/admin/auth/2fa/verify', { challengeToken, code });
    return data;
  },

  /** Checks the platform API key for the signed-in admin (403 if wrong). */
  verifyApiKey: async (apiKey: string): Promise<{ valid: true }> => {
    const { data } = await apiClient.post('/admin/auth/api-key/verify', { apiKey });
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
