import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations, TranslationKey } from '../lib/i18n';
import { LanguageContext } from './LanguageContextInstance';

/** An explicit choice made by this user through the language switcher. Wins over everything. */
const USER_LANGUAGE_KEY = 'user-language';
/** Last-known tenant default, cached so startup renders in the right direction with no flip. */
const TENANT_DEFAULT_KEY = 'tenant-default-language';
/**
 * Pre-`user-language` key. It was rewritten on every mount, so its presence never
 * meant the user had actually chosen — it is read once for migration, then dropped.
 */
const LEGACY_LANGUAGE_KEY = 'language';

const FALLBACK_LANGUAGE: Language = 'ar';

function asLanguage(value: string | null): Language | null {
  return value === 'ar' || value === 'fr' ? value : null;
}

function readStored(key: string): Language | null {
  try {
    return asLanguage(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function resolveInitialLanguage(): Language {
  return readStored(USER_LANGUAGE_KEY) ?? readStored(TENANT_DEFAULT_KEY) ?? FALLBACK_LANGUAGE;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(resolveInitialLanguage);

  // Drop the legacy key once. It is deliberately NOT migrated into
  // USER_LANGUAGE_KEY: it was written unconditionally, so treating it as a
  // deliberate choice would pin every existing user against the tenant default.
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_LANGUAGE_KEY);
    } catch {
      /* storage unavailable — nothing to clean up */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  /** A deliberate switch by the user. Pins their choice against the tenant default. */
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(USER_LANGUAGE_KEY, lang);
    } catch {
      /* storage unavailable — the choice still applies for this session */
    }
  }, []);

  /**
   * Apply the tenant-wide default. Caches it for the next startup, but only
   * changes the active language while this user has made no explicit choice.
   */
  const applyTenantDefault = useCallback((lang: Language) => {
    try {
      localStorage.setItem(TENANT_DEFAULT_KEY, lang);
    } catch {
      /* storage unavailable — the default still applies for this session */
    }
    if (readStored(USER_LANGUAGE_KEY)) return;
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] || key;
    },
    [language],
  );

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, applyTenantDefault, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
