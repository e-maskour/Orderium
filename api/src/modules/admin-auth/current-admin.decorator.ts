import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedAdmin } from './admin-auth.service';

/** The admin verified by SuperAdminGuard. Only valid on guarded routes. */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAdmin =>
    ctx.switchToHttp().getRequest<{ superAdmin: AuthenticatedAdmin }>()
      .superAdmin,
);
