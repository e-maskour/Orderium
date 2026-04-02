import { useLanguage } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  variant?: 'dark' | 'light';
}

export const LanguageToggle = ({ variant = 'light' }: LanguageToggleProps) => {
  const { language, setLanguage, t } = useLanguage();

  const isDark = variant === 'dark';
  const iconColor = isDark ? '#ffffff' : '#059669';
  const borderBase = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(5,150,105,0.25)';
  const bgBase = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(5,150,105,0.07)';
  const borderHover = isDark ? 'rgba(255,255,255,0.60)' : 'rgba(5,150,105,0.5)';
  const bgHover = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(5,150,105,0.16)';

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
        border: `2px solid ${borderBase}`,
        background: bgBase,
        cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
        outline: 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = bgHover;
        (e.currentTarget as HTMLButtonElement).style.borderColor = borderHover;
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = bgBase;
        (e.currentTarget as HTMLButtonElement).style.borderColor = borderBase;
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      <Globe style={{ width: '1.375rem', height: '1.375rem', color: iconColor }} />
    </button>
  );
};
