import ar_MA from './langs/ar_MA';
import fr_FR from './langs/fr_FR';

export type Language = 'ar' | 'fr';

export const translations = {
  ar: ar_MA,
  fr: fr_FR,
};

export type TranslationKey = keyof typeof translations.ar;

export { formatCurrency } from '@orderium/ui';

export const formatPhone = (phone: string): string => {
  // Moroccan phone format: 06 XX XX XX XX or +212 6 XX XX XX XX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
};

export const validateMoroccanPhone = (phone: string): boolean => {
  // Moroccan mobile: 06, 07 or +212 6/7
  const cleaned = phone.replace(/\D/g, '');
  const mobilePattern = /^(0[67]\d{8}|212[67]\d{8})$/;
  return mobilePattern.test(cleaned);
};
