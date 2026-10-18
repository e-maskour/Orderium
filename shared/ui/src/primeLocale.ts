import { addLocale, locale } from 'primereact/api';
import { arabicLocale, frenchLocale } from './theme';

let registered = false;

/**
 * Registers the French/Arabic PrimeReact locales (both use dd/mm/yy dates) and
 * activates the one matching the UI language. Call whenever the language changes.
 */
export function applyPrimeLocale(language: 'fr' | 'ar'): void {
  if (!registered) {
    addLocale('fr', frenchLocale);
    addLocale('ar', arabicLocale);
    registered = true;
  }
  locale(language);
}
