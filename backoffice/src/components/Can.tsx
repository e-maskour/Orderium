import { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface CanProps {
  /** Required permission. All must be held when several are given. */
  permission?: string | string[];
  /** At least one of these must be held. */
  anyOf?: string[];
  /** Every permission on this module counts — use for "can see the section". */
  module?: string;
  children: ReactNode;
  /** Rendered instead of nothing when the check fails. */
  fallback?: ReactNode;
}

/**
 * Conditionally renders UI the current user is allowed to reach.
 *
 * This hides affordances; it does not secure anything. Every action behind it
 * is independently enforced by `PermissionsGuard` on the API.
 */
export const Can = ({ permission, anyOf, module, children, fallback = null }: CanProps) => {
  const { hasAllPermissions, hasAnyPermission, canAccessModule } = usePermissions();

  const checks: boolean[] = [];
  if (permission) {
    const keys = Array.isArray(permission) ? permission : [permission];
    checks.push(hasAllPermissions(...keys));
  }
  if (anyOf?.length) checks.push(hasAnyPermission(...anyOf));
  if (module) checks.push(canAccessModule(module));

  const allowed = checks.length === 0 || checks.every(Boolean);
  return <>{allowed ? children : fallback}</>;
};
