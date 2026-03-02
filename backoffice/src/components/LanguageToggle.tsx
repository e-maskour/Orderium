import { useLanguage } from '../context/LanguageContext';
import { Button } from 'primereact/button';
import { Languages } from 'lucide-react';

export const LanguageToggle = () => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  return (
    <Button
      text
      rounded
      onClick={toggleLanguage}
      tooltip={language === 'ar' ? t('switchToFrench') : t('switchToArabic')}
      tooltipOptions={{ position: 'bottom' }}
      className="p-button-sm"
    >
      <Languages style={{ width: '1rem', height: '1rem', marginInlineEnd: '0.5rem' }} />
      <span>{language === 'ar' ? 'FR' : 'AR'}</span>
    </Button>
  );
};
