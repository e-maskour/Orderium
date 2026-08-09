import { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Translates the access-control vocabulary that reaches the client in English.
 *
 * The API serves the registry — module keys, action keys, role names and their
 * descriptions — from `common/access/access-modules.ts`, which is source code
 * and therefore monolingual. Rather than duplicating the catalogue per language
 * on the server, each item is looked up here by key (`accessModule_orders`,
 * `accessRoleDesc_sales_user`, …) and falls back to the English string the API
 * supplied when no translation exists yet. A newly added module shows up in
 * English instead of showing a raw key.
 */
export const useAccessLabels = () => {
  const { t } = useLanguage();

  const lookup = useCallback(
    (prefix: string, key: string, fallback = '') => {
      const translationKey = `${prefix}_${key}` as Parameters<typeof t>[0];
      const translated = t(translationKey);
      // `t` echoes the key back when it is undefined.
      return translated === translationKey ? fallback : translated;
    },
    [t],
  );

  return {
    categoryLabel: useCallback(
      (key: string, fallback = '') => lookup('accessCategory', key, fallback),
      [lookup],
    ),
    moduleLabel: useCallback(
      (key: string, fallback = '') => lookup('accessModule', key, fallback),
      [lookup],
    ),
    moduleDescription: useCallback(
      (key: string, fallback = '') => lookup('accessModuleDesc', key, fallback),
      [lookup],
    ),
    actionLabel: useCallback(
      (key: string, fallback = '') => lookup('accessAction', key, fallback),
      [lookup],
    ),
    /** Preset roles are translated; tenant-created roles keep their own name. */
    roleName: useCallback((name: string) => lookup('accessRole', name, name), [lookup]),
    roleDescription: useCallback(
      (name: string, fallback = '') => lookup('accessRoleDesc', name, fallback),
      [lookup],
    ),
  };
};
