import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/permissions.decorator';

export interface JwtUserWithPermissions {
  id: number;
  phoneNumber: string;
  isAdmin: boolean;
  isCustomer: boolean;
  scope: 'portal' | 'admin';
  roleId?: number | null;
  isSuperAdmin?: boolean;
  permissions?: string[];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission required on this route
    if (!required) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user: JwtUserWithPermissions }>();

    // Super admin bypasses all checks
    if (user?.isSuperAdmin) return true;

    const userPermissions: string[] = user?.permissions ?? [];
    if (!userPermissions.includes(required)) {
      throw new ForbiddenException(
        `You do not have the required permission: ${required}`,
      );
    }

    return true;
  }
}
