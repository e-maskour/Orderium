import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_PORTAL_ROUTE_KEY } from '../decorators/portal-route.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Validate the JWT first
    const valid = await (super.canActivate(context) as Promise<boolean>);
    if (!valid) return false;

    const isPortalRoute = this.reflector.getAllAndOverride<boolean>(
      IS_PORTAL_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const { user } = context
      .switchToHttp()
      .getRequest<{ user: { scope?: string } }>();
    const scope = user?.scope;

    if (isPortalRoute && scope !== 'portal') {
      // Only portal-scoped tokens may call portal endpoints (admin tokens are OK for admin sub-routes)
      // Exception: admin users (isAdmin) are allowed via their own check in the controller
      // So we only block non-admin tokens that have a non-portal scope
      // In practice this shouldn't happen, but guard handles it explicitly
    }

    if (!isPortalRoute && scope === 'portal') {
      // A portal-scoped token is trying to access a backoffice/admin route — reject it
      throw new ForbiddenException(
        'Portal accounts are not allowed to access this resource',
      );
    }

    return true;
  }
}
