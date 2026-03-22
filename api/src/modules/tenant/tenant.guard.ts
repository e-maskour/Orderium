import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guards all tenant-management endpoints (`/api/admin/tenants`).
 *
 * Authentication is done via a static `X-Super-Admin-Key` header compared
 * against the `SUPER_ADMIN_API_KEY` environment variable. This is appropriate
 * for infrastructure-level operations that run outside the normal JWT flow.
 *
 * Rotation: update the env var and redeploy — no DB change required.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const headers = request.headers as unknown as Record<
      string,
      string | string[] | undefined
    >;
    const rawKey = headers['x-super-admin-key'];
    const providedKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    const expectedKey = this.configService.get<string>('SUPER_ADMIN_API_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException(
        'SUPER_ADMIN_API_KEY is not configured on the server',
      );
    }

    if (!providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing super-admin key');
    }

    return true;
  }
}
