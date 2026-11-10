import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminSessionGuard, headerOf } from '../admin-auth/admin-session.guard';
import { safeEqual } from '../admin-auth/admin-crypto';

/** Messages the tenant dashboard matches on to open its "enter API key" dialog. */
export const API_KEY_REQUIRED = 'Super-admin API key required';
export const API_KEY_INVALID = 'Invalid super-admin API key';

/**
 * Guards every super-admin endpoint (`/api/admin/*`, `/api/super-admin/*`).
 *
 * A request must carry BOTH:
 *   1. `Authorization: Bearer <session>` — from signing in with email +
 *      password + 2FA (authenticator app or e-mail code). Missing/expired → 401.
 *   2. `X-Super-Admin-Key` — the platform `SUPER_ADMIN_API_KEY`, entered by the
 *      admin after signing in. Missing/wrong → 403, so the dashboard asks for
 *      the key instead of signing the admin out.
 *
 * The verified admin is attached as `request.superAdmin`.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly sessionGuard: AdminSessionGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.sessionGuard.canActivate(context);

    const expectedKey = this.configService.get<string>('SUPER_ADMIN_API_KEY');
    if (!expectedKey) {
      throw new InternalServerErrorException(
        'SUPER_ADMIN_API_KEY is not configured on the server',
      );
    }
    const providedKey = headerOf(
      context.switchToHttp().getRequest(),
      'x-super-admin-key',
    );
    if (!providedKey) throw new ForbiddenException(API_KEY_REQUIRED);
    if (!safeEqual(providedKey, expectedKey)) {
      throw new ForbiddenException(API_KEY_INVALID);
    }
    return true;
  }
}
