import { useLanguage } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';

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
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '2.75rem', height: '2.75rem', borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.35)',
        background: 'rgba(255,255,255,0.10)',
        cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
        outline: 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.20)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.60)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      <Globe style={{ width: '1.375rem', height: '1.375rem', color: '#ffffff' }} />
    </button>
  );
};
