export type AccessLevel = 'none' | 'read' | 'user' | 'manager';

/** What `levelForModule` reports when a permission set matches no bundle. */
export type DisplayedLevel = AccessLevel | 'custom';

export interface AccessCategory {
  key: string;
  label: string;
  order: number;
}

export interface AccessAction {
  key: string;
  label: string;
  description: string;
}

export interface AccessModule {
  key: string;
  category: string;
  label: string;
  description: string;
  actions: AccessAction[];
  /** Action keys granted by each level, mirroring the server registry. */
  levels: Record<Exclude<AccessLevel, 'none'>, string[]>;
}

export interface AccessRegistry {
  levels: AccessLevel[];
  categories: AccessCategory[];
  modules: AccessModule[];
}

/** The caller's resolved rights, as returned by `GET /access/me`. */
export interface EffectiveAccess {
  userId: number | null;
  roleIds: number[];
  roleNames: string[];
  isSuperAdmin: boolean;
  permissions: string[];
}

export const EMPTY_ACCESS: EffectiveAccess = {
  userId: null,
  roleIds: [],
  roleNames: [],
  isSuperAdmin: false,
  permissions: [],
};

export const permissionKey = (moduleKey: string, actionKey: string): string =>
  `${moduleKey}.${actionKey}`;

/** Permission keys granted by a level on a module. `none` grants nothing. */
export const permissionsForLevel = (mod: AccessModule, level: AccessLevel): string[] =>
  level === 'none' ? [] : mod.levels[level].map((action) => permissionKey(mod.key, action));

/**
 * Reverse of `permissionsForLevel` — what to show in the matrix for a module
 * given the keys a role holds. Mirrors the server helper of the same name so
 * both ends agree on what counts as "custom".
 */
export const levelForModule = (mod: AccessModule, heldKeys: Set<string>): DisplayedLevel => {
  const held = mod.actions
    .map((a) => permissionKey(mod.key, a.key))
    .filter((key) => heldKeys.has(key));

  if (held.length === 0) return 'none';

  for (const level of ['read', 'user', 'manager'] as const) {
    const bundle = permissionsForLevel(mod, level);
    if (bundle.length === held.length && bundle.every((k) => held.includes(k))) {
      return level;
    }
  }
  return 'custom';
};

export const groupModulesByCategory = (
  registry: AccessRegistry,
): Array<{ category: AccessCategory; modules: AccessModule[] }> =>
  [...registry.categories]
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      category,
      modules: registry.modules.filter((m) => m.category === category.key),
    }))
    .filter((group) => group.modules.length > 0);
