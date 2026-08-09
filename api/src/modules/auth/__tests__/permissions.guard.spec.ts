import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../guards/permissions.guard';
import {
  NoPermissionRequired,
  RequireAnyPermission,
  RequirePermission,
} from '../decorators/permissions.decorator';
import { Public } from '../decorators/public.decorator';
import { EffectiveAccess } from '../../access/access-control.service';

/**
 * Decorators are applied to a real class so the guard reads the same metadata
 * it would at runtime, rather than a hand-rolled Reflector stub that could
 * drift from how Nest actually stores it.
 */
class Routes {
  @RequirePermission('invoices.create')
  create() {}

  @RequirePermission('invoices.edit', 'invoices.validate')
  validate() {}

  @RequireAnyPermission('quotes.export', 'invoices.export')
  share() {}

  @NoPermissionRequired()
  me() {}

  @Public()
  login() {}

  undeclared() {}
}

@NoPermissionRequired()
class SelfServiceRoutes {
  inbox() {}

  @RequirePermission('users.view')
  adminList() {}
}

function contextFor(
  target: new () => unknown,
  method: string,
  user: { id: number; scope: 'admin' | 'portal' } | null,
): { context: ExecutionContext; request: Record<string, unknown> } {
  const request: Record<string, unknown> = user ? { user } : {};
  const context = {
    getType: () => 'http',
    getHandler: () => (target.prototype as Record<string, unknown>)[method],
    getClass: () => target,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function guardWith(access: Partial<EffectiveAccess>) {
  const resolved: EffectiveAccess = {
    userId: 1,
    roleIds: [],
    roleNames: [],
    isSuperAdmin: false,
    permissions: [],
    ...access,
  };
  const accessControl = {
    getEffectiveAccess: jest.fn(() => Promise.resolve(resolved)),
  };
  return {
    guard: new PermissionsGuard(new Reflector(), accessControl as never),
    accessControl,
    resolved,
  };
}

const admin = { id: 1, scope: 'admin' as const };

describe('PermissionsGuard', () => {
  it('allows a route whose required permission is held', async () => {
    const { guard } = guardWith({ permissions: ['invoices.create'] });
    const { context } = contextFor(Routes, 'create', admin);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a route whose required permission is missing', async () => {
    const { guard } = guardWith({ permissions: ['invoices.view'] });
    const { context } = contextFor(Routes, 'create', admin);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('requires every permission in `all` mode', async () => {
    const { guard } = guardWith({ permissions: ['invoices.edit'] });
    const { context } = contextFor(Routes, 'validate', admin);
    await expect(guard.canActivate(context)).rejects.toThrow(
      /invoices\.validate/,
    );
  });

  it('requires only one permission in `any` mode', async () => {
    const { guard } = guardWith({ permissions: ['invoices.export'] });
    const { context } = contextFor(Routes, 'share', admin);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies `any` mode when none of the alternatives is held', async () => {
    const { guard } = guardWith({ permissions: ['orders.export'] });
    const { context } = contextFor(Routes, 'share', admin);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('denies an undeclared route — fail-closed', async () => {
    const { guard } = guardWith({ permissions: ['invoices.create'] });
    const { context } = contextFor(Routes, 'undeclared', admin);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows an explicitly exempt route', async () => {
    const { guard } = guardWith({ permissions: [] });
    const { context } = contextFor(Routes, 'me', admin);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('lets a super admin through anything declared', async () => {
    const { guard } = guardWith({ isSuperAdmin: true, permissions: [] });
    for (const method of ['create', 'validate', 'share', 'undeclared']) {
      const { context } = contextFor(Routes, method, admin);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
  });

  it('skips public routes without resolving access at all', async () => {
    const { guard, accessControl } = guardWith({ permissions: [] });
    const { context } = contextFor(Routes, 'login', admin);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(accessControl.getEffectiveAccess).not.toHaveBeenCalled();
  });

  it('leaves portal-scoped tokens to their own scoping', async () => {
    const { guard, accessControl } = guardWith({ permissions: [] });
    const { context } = contextFor(Routes, 'create', {
      id: 5,
      scope: 'portal',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(accessControl.getEffectiveAccess).not.toHaveBeenCalled();
  });

  it('defers to JwtAuthGuard when there is no authenticated user', async () => {
    const { guard } = guardWith({ permissions: [] });
    const { context } = contextFor(Routes, 'create', null);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('attaches the resolved access to the request for downstream use', async () => {
    const { guard, resolved } = guardWith({ permissions: ['invoices.create'] });
    const { context, request } = contextFor(Routes, 'create', admin);
    await guard.canActivate(context);
    expect(request.access).toBe(resolved);
  });

  describe('handler over class precedence', () => {
    it('applies a class-level exemption to an undecorated handler', async () => {
      const { guard } = guardWith({ permissions: [] });
      const { context } = contextFor(SelfServiceRoutes, 'inbox', admin);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('lets a handler-level requirement override the class exemption', async () => {
      const { guard } = guardWith({ permissions: [] });
      const { context } = contextFor(SelfServiceRoutes, 'adminList', admin);
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
