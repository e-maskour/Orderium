import { useContext } from 'react';
import { GeneralSettingsContext } from '../context/GeneralSettingsContextInstance';
import type { GeneralSettingsContextValue } from '../types/general-params.types';

/**
 * useGeneralSettings — read the tenant's general params.
 *
 * Safe outside the provider: the context default is the same fail-open set of
 * defaults the provider falls back to.
 */
export function useGeneralSettings(): GeneralSettingsContextValue {
  return useContext(GeneralSettingsContext);
}
