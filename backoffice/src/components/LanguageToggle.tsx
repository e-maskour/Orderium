import { useLanguage } from '../context/LanguageContext';

export const LanguageToggle = () => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  return (
    <button
      onClick={toggleLanguage}
      title={language === 'ar' ? t('switchToFrench') : t('switchToArabic')}
      aria-label={language === 'ar' ? t('switchToFrench') : t('switchToArabic')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.3rem',
        width: 'auto',
        height: '2.75rem',
        paddingInline: '0.625rem',
        borderRadius: '0.75rem',
        border: '2px solid rgba(99,102,241,0.25)',
        background: 'rgba(99,102,241,0.07)',
        cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.16)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.5)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.07)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.25)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      <span style={{ fontSize: '1.375rem', lineHeight: 1 }}>{language === 'ar' ? '🇲🇦' : '🇫🇷'}</span>
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#6366f1',
          lineHeight: 1,
        }}
      >
        {t('currentLanguageName')}
      </span>
    </button>
  );
};
