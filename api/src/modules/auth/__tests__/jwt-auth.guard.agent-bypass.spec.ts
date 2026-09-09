import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { IS_AGENT_ROUTE_KEY } from '../decorators/agent-route.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const context = () =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: { scope: 'admin' } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as never;

describe('JwtAuthGuard agent-route bypass', () => {
  const guardWith = (keys: Record<string, boolean>) => {
    const reflector = {
      getAllAndOverride: (key: string) => keys[key] ?? false,
    };
    return new JwtAuthGuard(reflector as never);
  };

  it('lets an agent route through without validating a JWT', async () => {
    const guard = guardWith({ [IS_AGENT_ROUTE_KEY]: true });
    // If it tried to validate a JWT, passport would throw — reaching true
    // proves the bypass fired before any JWT work.
    await expect(guard.canActivate(context())).resolves.toBe(true);
  });

  it('still bypasses for public routes', async () => {
    const guard = guardWith({ [IS_PUBLIC_KEY]: true });
    await expect(guard.canActivate(context())).resolves.toBe(true);
  });

  it('does NOT bypass an ordinary route', async () => {
    const guard = guardWith({});
    // No metadata set, so the guard must fall through to real JWT validation
    // rather than returning true. super.canActivate throws without a request.
    await expect(guard.canActivate(context())).rejects.toBeDefined();
  });
});
