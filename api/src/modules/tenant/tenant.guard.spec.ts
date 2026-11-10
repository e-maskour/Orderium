import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SuperAdminGuard, API_KEY_INVALID, API_KEY_REQUIRED } from './tenant.guard';
import type { AdminSessionGuard } from '../admin-auth/admin-session.guard';
import type { AdminAuthService } from '../admin-auth/admin-auth.service';

const KEY = 'sk_admin_test_key';

function setup(headers: Record<string, string>, grantValid = false) {
  const request: { headers: Record<string, string>; superAdmin?: { id: number } } = { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const sessionGuard = {
    canActivate: jest.fn(async () => {
      request.superAdmin = { id: 7 };
      return true;
    }),
  } as unknown as AdminSessionGuard;
  const adminAuth = {
    isValidApiKeyGrant: jest.fn(async () => grantValid),
  } as unknown as AdminAuthService;
  const config = { get: () => KEY } as unknown as ConfigService;
  return { guard: new SuperAdminGuard(config, sessionGuard, adminAuth), context, adminAuth };
}

describe('SuperAdminGuard', () => {
  it('accepts the raw platform key', async () => {
    const { guard, context } = setup({ 'x-super-admin-key': KEY });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a wrong raw key', async () => {
    const { guard, context } = setup({ 'x-super-admin-key': 'wrong' });
    await expect(guard.canActivate(context)).rejects.toThrow(API_KEY_INVALID);
  });

  it('accepts a valid remembered grant, checked against the signed-in admin', async () => {
    const { guard, context, adminAuth } = setup({ 'x-super-admin-grant': 'grant' }, true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(adminAuth.isValidApiKeyGrant).toHaveBeenCalledWith(7, 'grant');
  });

  it('rejects an invalid grant with the "invalid key" message', async () => {
    const { guard, context } = setup({ 'x-super-admin-grant': 'grant' }, false);
    await expect(guard.canActivate(context)).rejects.toThrow(API_KEY_INVALID);
  });

  it('asks for the key when neither header is sent', async () => {
    const { guard, context } = setup({});
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(API_KEY_REQUIRED);
  });
});
