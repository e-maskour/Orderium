import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { seedersApi } from '../api/seeders';
import type { SeederLogsFilterParams, SeederOptions } from '../types/seeder';

export const seederKeys = {
  all: ['seeders'] as const,
  catalogue: () => [...seederKeys.all, 'catalogue'] as const,
  allStatus: () => [...seederKeys.all, 'status'] as const,
  tenantStatus: (id: number) => [...seederKeys.all, 'status', id] as const,
  logs: (params?: SeederLogsFilterParams) => [...seederKeys.all, 'logs', params] as const,
};

export function useSeederCatalogue() {
  return useQuery({
    queryKey: seederKeys.catalogue(),
    queryFn: () => seedersApi.getCatalogue(),
    // The catalogue only changes when the API is redeployed.
    staleTime: 5 * 60_000,
  });
}

export function useAllSeederStatus() {
  return useQuery({
    queryKey: seederKeys.allStatus(),
    queryFn: () => seedersApi.getAllStatus(),
    staleTime: 30_000,
  });
}

export function useSeederLogs(params: SeederLogsFilterParams = {}) {
  return useQuery({
    queryKey: seederKeys.logs(params),
    queryFn: () => seedersApi.getLogs(params),
    staleTime: 15_000,
  });
}

function useInvalidateSeeders() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: seederKeys.allStatus() });
    qc.invalidateQueries({ queryKey: seederKeys.logs() });
  };
}

export function useRunSeederForTenant() {
  const invalidate = useInvalidateSeeders();
  return useMutation({
    mutationFn: (vars: { tenantId: number; key: string; options?: SeederOptions }) =>
      seedersApi.runForTenant(vars.tenantId, vars.key, vars.options ?? {}),
    onSuccess: invalidate,
  });
}

export function useRunPendingForTenant() {
  const invalidate = useInvalidateSeeders();
  return useMutation({
    mutationFn: (vars: { tenantId: number; optionsByKey?: Record<string, SeederOptions> }) =>
      seedersApi.runPendingForTenant(vars.tenantId, vars.optionsByKey ?? {}),
    onSuccess: invalidate,
  });
}

export function useRunSeederFleet() {
  const invalidate = useInvalidateSeeders();
  return useMutation({
    mutationFn: (vars: { key: string; options?: SeederOptions }) =>
      seedersApi.runFleet(vars.key, vars.options ?? {}),
    onSuccess: invalidate,
  });
}
