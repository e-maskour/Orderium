import ar_MA from './langs/ar_MA';
import fr_FR from './langs/fr_FR';

export type Language = 'ar' | 'fr';

export const translations = {
  ar: ar_MA,
  fr: fr_FR,
};

export type TranslationKey = keyof typeof translations.ar;

export const formatCurrency = (amount: number, lang: Language): string => {
  const formatted = amount.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  if (lang === 'ar') {
    return `${formatted} د.م`;
  }
  return `${formatted} DH`;
};
