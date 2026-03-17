import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ReactNode } from 'react';
import { TenantStatusGuard } from './TenantStatusGuard';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading, admin } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <span style={{ color: '#64748b' }}>{t('loading')}</span>
      </div>
    );
  }

  if (!isAuthenticated || !admin?.isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <TenantStatusGuard>{children}</TenantStatusGuard>;
};
