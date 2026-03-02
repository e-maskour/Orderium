import { useLanguage } from '@/context/LanguageContext';
import { Button } from 'primereact/button';

export const LanguageToggle = () => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  return (
    <Button
      icon="pi pi-globe"
      text
      rounded
      severity="secondary"
      onClick={toggleLanguage}
      aria-label={language === 'ar' ? t('switchToFrench') : t('switchToArabic')}
      tooltip={language === 'ar' ? 'FR' : 'ع'}
      tooltipOptions={{ position: 'bottom' }}
    />
  );
};
