import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  AccessControlService,
  EffectiveAccess,
} from '../../access/access-control.service';
import { readAccessDeclaration } from '../../access/access-decision';

export interface JwtUser {
  id: number;
  phoneNumber: string;
  isAdmin: boolean;
  isCustomer: boolean;
  scope: 'portal' | 'admin';
}

/** Request shape after `JwtAuthGuard` and this guard have run. */
export interface RequestWithAccess {
  user?: JwtUser;
  access?: EffectiveAccess;
}

/**
 * Enforces the Odoo-style access model on every admin-scope route.
 *
 * Order of decision:
 *   1. `@Public()`                 → allow (no identity to check).
 *   2. no authenticated user       → allow; `JwtAuthGuard` already ruled.
 *   3. portal-scoped token         → allow; portal accounts are governed by
 *                                    `@PortalRoute()` and their own record
 *                                    scoping, not by backoffice roles.
 *   4. `@NoPermissionRequired()`   → allow.
 *   5. super-admin role            → allow.
 *   6. declared permission met     → allow.
 *   7. anything else               → deny, including a route that declared
 *                                    nothing at all.
 *
 * Step 7 is the point of the design: forgetting to decorate a handler closes
 * it rather than opening it, and `AccessCoverageService` turns that latent
 * 403 into a startup failure so it is caught in development, not production.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAccess>();
    const user = request.user;
    if (!user) return true;
    if (user.scope === 'portal') return true;

    const access = await this.accessControl.getEffectiveAccess(user.id);
    // Downstream services read this instead of resolving a second time.
    request.access = access;

    const declaration = readAccessDeclaration(
      context.getHandler(),
      context.getClass(),
    );

    if (declaration.kind === 'exempt') return true;

    if (access.isSuperAdmin) return true;

    if (declaration.kind === 'none') {
      this.logger.error(
        `Route ${context.getClass().name}.${context.getHandler().name} declares no permission — denying. ` +
          'Add @RequirePermission(...) or @NoPermissionRequired().',
      );
      throw new ForbiddenException(
        'This resource is not available to your account',
      );
    }

    const requirement = declaration.requirement;
    const held = new Set(access.permissions);
    const satisfied =
      requirement.mode === 'any'
        ? requirement.permissions.some((p) => held.has(p))
        : requirement.permissions.every((p) => held.has(p));

    if (!satisfied) {
      const missing = requirement.permissions.filter((p) => !held.has(p));
      throw new ForbiddenException(
        requirement.mode === 'any'
          ? `You need one of the following permissions: ${requirement.permissions.join(', ')}`
          : `You do not have the required permission: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
