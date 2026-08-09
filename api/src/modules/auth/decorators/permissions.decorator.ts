import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';
export const NO_PERMISSION_KEY = 'noPermissionRequired';

export interface PermissionRequirement {
  /** `all` — every key required. `any` — at least one. */
  mode: 'all' | 'any';
  permissions: string[];
}

/**
 * Requires ALL of the listed permissions.
 *
 * Enforcement is fail-closed: an admin-scope route carrying neither this
 * decorator nor `@NoPermissionRequired()` is rejected, and the boot-time
 * coverage check refuses to start the application until every route declares
 * one or the other.
 *
 * @example @RequirePermission('invoices.create')
 * @example @RequirePermission('invoices.edit', 'invoices.validate')
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata<string, PermissionRequirement>(REQUIRE_PERMISSION_KEY, {
    mode: 'all',
    permissions,
  });

/**
 * Requires AT LEAST ONE of the listed permissions. Use for endpoints that
 * legitimately serve several modules, such as a shared document preview.
 *
 * @example @RequireAnyPermission('quotes.export', 'invoices.export')
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata<string, PermissionRequirement>(REQUIRE_PERMISSION_KEY, {
    mode: 'any',
    permissions,
  });

/**
 * Marks a route as deliberately ungoverned by the permission system — health
 * checks, authentication, onboarding, and self-service endpoints where the
 * caller's own identity is the only authorisation needed.
 *
 * This is an explicit statement, not an oversight. Prefer a permission.
 */
export const NoPermissionRequired = () => SetMetadata(NO_PERMISSION_KEY, true);
