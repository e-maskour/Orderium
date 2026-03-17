import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex align-items-center justify-content-center px-3" style={{ minHeight: '100vh', background: 'var(--surface-ground)' }}>
      <div className="text-center" style={{ maxWidth: '28rem' }}>
        <h1 className="mb-3 font-bold text-primary" style={{ fontSize: 'clamp(3.5rem, 10vw, 6rem)' }}>404</h1>
        <p className="mb-4 text-color-secondary" style={{ fontSize: 'clamp(1.125rem, 3vw, 1.5rem)' }}>{t('oopsPageNotFound')}</p>
        <a href="/" className="cl-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '1rem', padding: '0.75rem 2rem', borderRadius: '0.75rem' }}>
          {t('returnToHome')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
