import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export const LanguageToggle = () => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative group"
      aria-label={language === 'ar' ? t('switchToFrench') : t('switchToArabic')}
    >
      <Languages className="h-5 w-5" />
      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium bg-card px-2 py-0.5 rounded shadow-card opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {language === 'ar' ? 'FR' : 'ع'}
      </span>
    </Button>
  );
};
