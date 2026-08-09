import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Shown when a route is reached without the permission it declares.
 *
 * It names the roles the user actually holds, because "access denied" with no
 * further information is the single most common source of support tickets in a
 * role-based system.
 */
export const ForbiddenPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { roleNames } = usePermissions();

  const translatedRoles = roleNames.map((name) => {
    const key = `accessRole_${name}` as Parameters<typeof t>[0];
    const translated = t(key);
    return translated === key ? name : translated;
  });

  return (
    <div
      className="flex flex-column align-items-center justify-content-center text-center"
      style={{ minHeight: '60vh', padding: '2rem', gap: '1rem' }}
    >
      <ShieldOff size={48} style={{ color: '#dc2626' }} aria-hidden />

      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
        {t('accessForbiddenTitle')}
      </h1>

      <p style={{ margin: 0, maxWidth: '32rem', color: '#64748b' }}>{t('accessForbiddenBody')}</p>

      {translatedRoles.length > 0 && (
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>
          {t('accessForbiddenRoles')}: {translatedRoles.join(', ')}
        </p>
      )}

      <button type="button" className="p-button p-component" onClick={() => navigate('/dashboard')}>
        <span className="p-button-label">{t('backToDashboard')}</span>
      </button>
    </div>
  );
};

export default ForbiddenPage;
