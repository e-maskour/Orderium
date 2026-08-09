import { useAuth } from '../context/AuthContext';

/**
 * Permission checks without pulling in the rest of the auth context.
 *
 * `hasPermission('invoices.create')` mirrors the server's `@RequirePermission`
 * exactly, including the super-admin bypass, so a control hidden here is a
 * control the API would also refuse.
 */
export const usePermissions = () => {
  const {
    access,
    isAccessLoaded,
    refreshAccess,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
  } = useAuth();

  return {
    permissions: access.permissions,
    roleNames: access.roleNames,
    isSuperAdmin: access.isSuperAdmin,
    isAccessLoaded,
    refreshAccess,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
  };
};
