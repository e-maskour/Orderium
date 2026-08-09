import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ReactNode } from 'react';
import { TenantStatusGuard } from './TenantStatusGuard';
import { ForbiddenPage } from '../pages/ForbiddenPage';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Permission required to open this route. All must be held when several. */
  permission?: string | string[];
  /** At least one of these must be held — for pages serving several modules. */
  anyPermission?: string[];
}

/**
 * Authentication, tenant status, and — when the route declares one — the
 * permission needed to reach it.
 *
 * Waiting for `isAccessLoaded` matters: rendering the 403 page while the
 * effective permission set is still in flight would flash "access denied" at
 * users who do in fact have access.
 */
export const ProtectedRoute = ({ children, permission, anyPermission }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, isAccessLoaded, admin, hasAllPermissions, hasAnyPermission } =
    useAuth();
  const { t } = useLanguage();

  const spinner = (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <span style={{ color: '#64748b' }}>{t('loading')}</span>
    </div>
  );

  if (isLoading) return spinner;

  if (!isAuthenticated || !admin?.isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const needsCheck = Boolean(permission || anyPermission?.length);
  if (needsCheck && !isAccessLoaded) return spinner;

  if (needsCheck) {
    const keys = permission ? (Array.isArray(permission) ? permission : [permission]) : [];
    const allowed =
      (keys.length === 0 || hasAllPermissions(...keys)) &&
      (!anyPermission?.length || hasAnyPermission(...anyPermission));

    if (!allowed) {
      return (
        <TenantStatusGuard>
          <ForbiddenPage />
        </TenantStatusGuard>
      );
    }
  }

  return <TenantStatusGuard>{children}</TenantStatusGuard>;
};
