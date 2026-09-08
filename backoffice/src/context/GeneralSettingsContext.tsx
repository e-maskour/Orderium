import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, API_ROUTES } from '../common';
import { useAuth } from './AuthContext';
import {
  GeneralSettingsContext,
  GENERAL_SETTINGS_QUERY_KEY,
} from './GeneralSettingsContextInstance';
import { GENERAL_PARAMS_DEFAULTS, type GeneralParams } from '../types/general-params.types';

/**
 * GeneralSettingsProvider — loads the tenant-wide `general` configuration
 * entity and exposes it to the whole app.
 *
 * Fail-open by design: while loading, when unauthenticated, or if the request
 * errors, consumers see GENERAL_PARAMS_DEFAULTS. A misbehaving request must
 * never strand a touch terminal without its on-screen keyboard.
 */
export function GeneralSettingsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: GENERAL_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<GeneralParams>(API_ROUTES.CONFIGURATIONS.GENERAL);
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const value = useMemo(
    () => ({
      ...GENERAL_PARAMS_DEFAULTS,
      ...(data ?? {}),
      isLoading: isAuthenticated && isLoading,
      isResolved: !!data,
    }),
    [data, isLoading, isAuthenticated],
  );

  return (
    <GeneralSettingsContext.Provider value={value}>{children}</GeneralSettingsContext.Provider>
  );
}
