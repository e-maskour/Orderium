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
import {
  AdminAuthService,
  type AuthenticatedAdmin,
} from '../admin-auth/admin-auth.service';

/** Messages the tenant dashboard matches on to open its "enter API key" dialog. */
export const API_KEY_REQUIRED = 'Super-admin API key required';
export const API_KEY_INVALID = 'Invalid super-admin API key';

/**
 * Guards every super-admin endpoint (`/api/admin/*`, `/api/super-admin/*`).
 *
 * A request must carry BOTH:
 *   1. `Authorization: Bearer <session>` — from signing in with email +
 *      password + 2FA (authenticator app or e-mail code). Missing/expired → 401.
 *   2. The platform key, either:
 *      - `X-Super-Admin-Key` — the raw `SUPER_ADMIN_API_KEY`, entered by the
 *        admin after signing in, or
 *      - `X-Super-Admin-Grant` — a signed 30-day grant returned when the admin
 *        ticked "remember on this device". It is bound to that admin and dies
 *        when the platform key is rotated.
 *      Missing/wrong → 403, so the dashboard asks for the key instead of
 *      signing the admin out.
 *
 * The verified admin is attached as `request.superAdmin`.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly sessionGuard: AdminSessionGuard,
    private readonly adminAuth: AdminAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.sessionGuard.canActivate(context);
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      superAdmin?: AuthenticatedAdmin;
    }>();

    const expectedKey = this.configService.get<string>('SUPER_ADMIN_API_KEY');
    if (!expectedKey) {
      throw new InternalServerErrorException(
        'SUPER_ADMIN_API_KEY is not configured on the server',
      );
    }

    const providedKey = headerOf(request, 'x-super-admin-key');
    if (providedKey) {
      if (!safeEqual(providedKey, expectedKey)) {
        throw new ForbiddenException(API_KEY_INVALID);
      }
      return true;
    }

    const grant = headerOf(request, 'x-super-admin-grant');
    if (!grant) throw new ForbiddenException(API_KEY_REQUIRED);
    const adminId = request.superAdmin?.id;
    if (!adminId || !(await this.adminAuth.isValidApiKeyGrant(adminId, grant))) {
      throw new ForbiddenException(API_KEY_INVALID);
    }
    return true;
  }
}
