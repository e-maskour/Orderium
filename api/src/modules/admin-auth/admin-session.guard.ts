import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

type AdminRequest = {
  headers: Record<string, string | string[] | undefined>;
  superAdmin?: unknown;
};

export function headerOf(req: AdminRequest, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Requires a signed-in admin (email + password + 2FA) — but NOT the platform
 * API key. Used for the account endpoints (`/admin/auth/me`, logout, API-key
 * check) that must work before the key has been entered.
 *
 * The verified admin is attached as `request.superAdmin`.
 */
@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly adminAuth: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const auth = headerOf(request, 'authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException('Sign in required');
    request.superAdmin = await this.adminAuth.validateSession(token);
    return true;
  }
}
