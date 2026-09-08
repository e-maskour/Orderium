/**
 * General params — tenant-wide UI/behaviour preferences that do not belong to
 * any single business domain.
 *
 * Single source of truth shared by the configurations service (lazy default
 * creation) and the configurations seeder, so the two can never drift.
 */
export const GENERAL_ENTITY = 'general';

export const TENANT_LANGUAGES = ['fr', 'ar'] as const;
export type TenantLanguage = (typeof TENANT_LANGUAGES)[number];

export interface GeneralParams {
  /** When false, the virtual keyboard and its floating toggle are not rendered. */
  keyboardEnabled: boolean;
  /**
   * Language the backoffice starts in for anyone who has not picked one
   * explicitly. An explicit per-user choice always wins over this.
   */
  defaultLanguage: TenantLanguage;
}

export const GENERAL_DEFAULTS: GeneralParams = {
  keyboardEnabled: true,
  defaultLanguage: 'ar',
};
