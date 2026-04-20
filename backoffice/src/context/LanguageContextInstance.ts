import { createContext } from 'react';
import type { Language, TranslationKey } from '../lib/i18n';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  dir: 'ltr' | 'rtl';
}

/**
 * Stable context instance in its own module so that HMR updates to
 * LanguageContext.tsx (triggered by i18n file changes) do NOT recreate
 * this object — which would break any already-rendered consumers.
 */
export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
