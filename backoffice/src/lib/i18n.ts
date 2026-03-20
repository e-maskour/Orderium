import ar_MA from './langs/ar_MA';
import fr_FR from './langs/fr_FR';

export type Language = 'ar' | 'fr';

export const translations = {
  ar: ar_MA,
  fr: fr_FR,
};

export type TranslationKey = keyof typeof translations.ar;

export { formatCurrency } from '@orderium/ui';
