import { AccessControlService } from '../access-control.service';

interface RoleRow {
  id: number;
  name: string;
  isSuperAdmin: boolean;
  permissions: string[];
  implies: number[];
}

/** Minimal stand-in for cache-manager with real key/TTL-free semantics. */
class FakeCache {
  store = new Map<string, unknown>();
  get = jest.fn((key: string) => Promise.resolve(this.store.get(key)));
  set = jest.fn((key: string, value: unknown) => {
    this.store.set(key, value);
    return Promise.resolve();
  });
  del = jest.fn((key: string) => {
    this.store.delete(key);
    return Promise.resolve();
  });
}

function buildService(roles: RoleRow[], assignments: Record<number, number[]>) {
  const cache = new FakeCache();
  const query = jest.fn((sql: string, params?: unknown[]) => {
    if (sql.includes('FROM "roles"')) {
      return Promise.resolve(roles.map((r) => ({ ...r })));
    }
    const userId = Number((params ?? [])[0]);
    return Promise.resolve(
      (assignments[userId] ?? []).map((roleId) => ({ roleId })),
    );
  });

  const tenantConn = {
    getCurrentTenantSlug: () => 'acme',
    getCurrentDataSource: () => ({ query }),
  };

  const service = new AccessControlService(tenantConn as never, cache as never);
  return { service, cache, query };
}

const role = (partial: Partial<RoleRow> & { id: number }): RoleRow => ({
  name: `role-${partial.id}`,
  isSuperAdmin: false,
  permissions: [],
  implies: [],
  ...partial,
});

describe('AccessControlService', () => {
  it('unions permissions across every role a user holds', async () => {
    const { service } = buildService(
      [
        role({ id: 1, permissions: ['orders.view', 'orders.create'] }),
        role({ id: 2, permissions: ['orders.view', 'stock.view'] }),
      ],
      { 7: [1, 2] },
    );

    const access = await service.getEffectiveAccess(7);
    expect(access.permissions).toEqual([
      'orders.create',
      'orders.view',
      'stock.view',
    ]);
    expect(access.roleIds.sort()).toEqual([1, 2]);
  });

  it('expands implications transitively', async () => {
    const { service } = buildService(
      [
        role({
          id: 1,
          name: 'manager',
          permissions: ['orders.delete'],
          implies: [2],
        }),
        role({
          id: 2,
          name: 'user',
          permissions: ['orders.create'],
          implies: [3],
        }),
        role({ id: 3, name: 'read', permissions: ['orders.view'] }),
      ],
      { 7: [1] },
    );

    const access = await service.getEffectiveAccess(7);
    expect(access.permissions).toEqual([
      'orders.create',
      'orders.delete',
      'orders.view',
    ]);
    // Only the directly assigned role is reported as held.
    expect(access.roleIds).toEqual([1]);
    expect(access.roleNames).toEqual(['manager']);
  });

  it('terminates on a cyclic implication graph', async () => {
    const { service } = buildService(
      [
        role({ id: 1, permissions: ['a.view'], implies: [2] }),
        role({ id: 2, permissions: ['b.view'], implies: [3] }),
        role({ id: 3, permissions: ['c.view'], implies: [1] }),
      ],
      { 7: [1] },
    );

    const access = await service.getEffectiveAccess(7);
    expect(access.permissions).toEqual(['a.view', 'b.view', 'c.view']);
  });

  it('resolves a diamond without duplicating permissions', async () => {
    const { service } = buildService(
      [
        role({ id: 1, implies: [2, 3] }),
        role({ id: 2, permissions: ['shared.view'], implies: [4] }),
        role({ id: 3, permissions: ['shared.view'], implies: [4] }),
        role({ id: 4, permissions: ['base.view'] }),
      ],
      { 7: [1] },
    );

    const access = await service.getEffectiveAccess(7);
    expect(access.permissions).toEqual(['base.view', 'shared.view']);
  });

  it('propagates the super-admin flag through implications', async () => {
    const { service } = buildService(
      [role({ id: 1, implies: [2] }), role({ id: 2, isSuperAdmin: true })],
      { 7: [1] },
    );

    const access = await service.getEffectiveAccess(7);
    expect(access.isSuperAdmin).toBe(true);
  });

  it('grants nothing to a user with no roles', async () => {
    const { service } = buildService([role({ id: 1 })], { 7: [] });

    const access = await service.getEffectiveAccess(7);
    expect(access).toEqual({
      userId: 7,
      roleIds: [],
      roleNames: [],
      isSuperAdmin: false,
      permissions: [],
    });
  });

  it('ignores an assignment pointing at a role that no longer exists', async () => {
    const { service } = buildService(
      [role({ id: 1, permissions: ['a.view'] })],
      {
        7: [1, 99],
      },
    );

    const access = await service.getEffectiveAccess(7);
    expect(access.permissions).toEqual(['a.view']);
    expect(access.roleNames).toEqual(['role-1']);
  });

  it('serves a repeat resolution from cache', async () => {
    const { service, query } = buildService(
      [role({ id: 1, permissions: ['a.view'] })],
      { 7: [1] },
    );

    await service.getEffectiveAccess(7);
    const callsAfterFirst = query.mock.calls.length;
    await service.getEffectiveAccess(7);

    expect(query.mock.calls.length).toBe(callsAfterFirst);
  });

  it('re-resolves after invalidation, so a role edit lands immediately', async () => {
    const roles = [role({ id: 1, permissions: ['a.view'] })];
    const { service } = buildService(roles, { 7: [1] });

    expect((await service.getEffectiveAccess(7)).permissions).toEqual([
      'a.view',
    ]);

    roles[0].permissions = ['a.view', 'a.edit'];
    expect((await service.getEffectiveAccess(7)).permissions).toEqual([
      'a.view',
    ]);

    await service.invalidate();
    expect((await service.getEffectiveAccess(7)).permissions).toEqual([
      'a.edit',
      'a.view',
    ]);
  });

  it('moves the epoch forward even when invalidated twice in the same millisecond', async () => {
    const { service, cache } = buildService([role({ id: 1 })], { 7: [1] });
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);

    await service.invalidate();
    const first = cache.store.get('tenant:acme:acl:epoch');
    await service.invalidate();
    const second = cache.store.get('tenant:acme:acl:epoch');

    expect(second).toBeGreaterThan(first as number);
    now.mockRestore();
  });

  it('answers hasPermission from the resolved set and the super-admin bypass', async () => {
    const { service } = buildService(
      [
        role({ id: 1, permissions: ['orders.view'] }),
        role({ id: 2, isSuperAdmin: true }),
      ],
      { 7: [1], 8: [2] },
    );

    await expect(service.hasPermission(7, 'orders.view')).resolves.toBe(true);
    await expect(service.hasPermission(7, 'orders.delete')).resolves.toBe(
      false,
    );
    await expect(service.hasPermission(8, 'orders.delete')).resolves.toBe(true);
  });
});
