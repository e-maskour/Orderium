import { useLanguage } from '@/context/LanguageContext';
import { Button } from 'primereact/button';

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  return (
    <Button
      text
      severity="secondary"
      size="small"
      icon="pi pi-globe"
      label={language === 'ar' ? 'FR' : 'العربية'}
      onClick={toggleLanguage}
    />
  );
};
