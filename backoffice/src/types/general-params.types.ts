import type { Language } from '../lib/i18n';

/**
 * General params — tenant-wide UI preferences stored in the `general`
 * configuration entity. Mirrors `api/src/modules/configurations/general-params.constants.ts`.
 */
export interface GeneralParams {
  /** When false, the virtual keyboard and its floating toggle are not rendered. */
  keyboardEnabled: boolean;
  /**
   * Language the backoffice starts in for anyone who has not picked one
   * explicitly. An explicit per-user choice always wins over this.
   */
  defaultLanguage: Language;
}

export const GENERAL_PARAMS_DEFAULTS: GeneralParams = {
  keyboardEnabled: true,
  defaultLanguage: 'ar',
};

export interface GeneralSettingsContextValue extends GeneralParams {
  /** True while the first fetch is in flight — values are the defaults until then. */
  isLoading: boolean;
  /**
   * True only once the server has actually answered. Until then the values are
   * client-side defaults, which must not be mistaken for the tenant's choice.
   */
  isResolved: boolean;
}
