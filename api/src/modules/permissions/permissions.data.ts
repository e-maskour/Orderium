import { buildPermissionCatalogue } from '../../common/access/access-modules';

export type PermissionSeed = ReturnType<
  typeof buildPermissionCatalogue
>[number];

/**
 * Default permissions seeded for every tenant.
 *
 * Derived from `common/access/access-modules.ts` rather than hand-maintained:
 * the registry already declares every module, action and access level, and
 * keeping a second list in sync with it was how the catalogue fell behind the
 * controllers in the first place.
 */
export const DEFAULT_PERMISSIONS: PermissionSeed[] = buildPermissionCatalogue();
