import { useLanguage } from '../context/LanguageContext';
import { Languages } from 'lucide-react';

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
      title={language === 'ar' ? 'Changer en français' : 'التبديل للعربية'}
    >
      <Languages className="w-4 h-4" />
      <span>{language === 'ar' ? 'FR' : 'AR'}</span>
    </button>
  );
};
