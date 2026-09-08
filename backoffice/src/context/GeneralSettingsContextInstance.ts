import { createContext } from 'react';
import {
  GENERAL_PARAMS_DEFAULTS,
  type GeneralSettingsContextValue,
} from '../types/general-params.types';

export const GENERAL_SETTINGS_QUERY_KEY = ['configurations', 'general'] as const;

export const GeneralSettingsContext = createContext<GeneralSettingsContextValue>({
  ...GENERAL_PARAMS_DEFAULTS,
  isLoading: false,
  isResolved: false,
});
