import {
  ACCESS_CATEGORIES,
  ACCESS_MODULES,
  ALL_PERMISSION_KEYS,
  buildPermissionCatalogue,
  isKnownPermissionKey,
  levelForPermissions,
  permissionsForLevel,
} from '../../../common/access/access-modules';
import {
  ROLE_PRESETS,
  permissionsForPreset,
} from '../../../common/access/access-presets';

describe('access registry', () => {
  it('gives every module a unique key and a known category', () => {
    const keys = ACCESS_MODULES.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);

    const categories = new Set(ACCESS_CATEGORIES.map((c) => c.key));
    for (const mod of ACCESS_MODULES) {
      expect(categories).toContain(mod.category);
    }
  });

  it('produces one catalogue entry per module/action pair', () => {
    const catalogue = buildPermissionCatalogue();
    expect(catalogue).toHaveLength(ALL_PERMISSION_KEYS.length);
    expect(new Set(catalogue.map((e) => e.key)).size).toBe(catalogue.length);
    for (const entry of catalogue) {
      expect(entry.key).toBe(`${entry.module}.${entry.action}`);
      expect(isKnownPermissionKey(entry.key)).toBe(true);
    }
  });

  it('keeps levels strictly nested: read ⊆ user ⊆ manager', () => {
    for (const mod of ACCESS_MODULES) {
      const read = permissionsForLevel(mod.key, 'read');
      const user = permissionsForLevel(mod.key, 'user');
      const manager = permissionsForLevel(mod.key, 'manager');

      expect(read.every((k) => user.includes(k))).toBe(true);
      expect(user.every((k) => manager.includes(k))).toBe(true);
      expect(manager).toHaveLength(mod.actions.length);
      expect(permissionsForLevel(mod.key, 'none')).toEqual([]);
    }
  });

  it('round-trips a level through levelForPermissions', () => {
    for (const mod of ACCESS_MODULES) {
      for (const level of ['read', 'user', 'manager'] as const) {
        const bundle = permissionsForLevel(mod.key, level);
        if (bundle.length === 0) continue; // e.g. pos has no read bundle
        // A bundle may coincide with a weaker one when a module has few
        // actions; the reported level must at least grant the same keys.
        const reported = levelForPermissions(mod.key, bundle);
        expect(reported).not.toBe('custom');
        expect(reported).not.toBe('none');
        expect(permissionsForLevel(mod.key, reported as never).sort()).toEqual(
          [...bundle].sort(),
        );
      }
    }
  });

  it('reports none for an empty set and custom for a partial one', () => {
    expect(levelForPermissions('invoices', [])).toBe('none');
    expect(levelForPermissions('invoices', ['invoices.delete'])).toBe('custom');
  });

  it('ignores keys belonging to other modules', () => {
    expect(levelForPermissions('invoices', ['orders.view'])).toBe('none');
  });
});

describe('role presets', () => {
  it('names each preset once', () => {
    const names = ROLE_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('only references modules and permissions that exist', () => {
    const moduleKeys = new Set(ACCESS_MODULES.map((m) => m.key));
    for (const preset of ROLE_PRESETS) {
      for (const moduleKey of Object.keys(preset.modules ?? {})) {
        expect(moduleKeys).toContain(moduleKey);
      }
      for (const key of preset.extraPermissions ?? []) {
        expect(isKnownPermissionKey(key)).toBe(true);
      }
      for (const key of permissionsForPreset(preset)) {
        expect(isKnownPermissionKey(key)).toBe(true);
      }
    }
  });

  it('only implies presets that are themselves seeded, without cycles', () => {
    const byName = new Map(ROLE_PRESETS.map((p) => [p.name, p]));

    for (const preset of ROLE_PRESETS) {
      const seen = new Set<string>();
      const queue = [...(preset.implies ?? [])];
      while (queue.length) {
        const name = queue.shift() as string;
        expect(byName.has(name)).toBe(true);
        expect(name).not.toBe(preset.name);
        if (seen.has(name)) continue;
        seen.add(name);
        queue.push(...(byName.get(name)?.implies ?? []));
      }
    }
  });

  it('gives the administrator preset the super-admin bypass', () => {
    const admin = ROLE_PRESETS.find((p) => p.isSuperAdmin);
    expect(admin?.name).toBe('administrator');
  });

  it('gives the administrator preset every permission in the catalogue', () => {
    // The bypass alone would do, but a role holding nothing renders as "no
    // access" in the role matrix — a module added later would never show up.
    const admin = ROLE_PRESETS.find((p) => p.isSuperAdmin);
    expect(permissionsForPreset(admin!)).toEqual(
      [...ALL_PERMISSION_KEYS].sort(),
    );
  });

  it('gives the read-only preset no write permission anywhere', () => {
    const readonly = ROLE_PRESETS.find((p) => p.name === 'readonly');
    const writeActions = ['create', 'edit', 'delete', 'validate', 'cancel'];
    for (const key of permissionsForPreset(readonly!)) {
      const action = key.split('.')[1];
      expect(writeActions).not.toContain(action);
    }
  });
});
