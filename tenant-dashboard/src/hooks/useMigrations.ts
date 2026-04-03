import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { migrationsApi } from '../api/migrations';
import type { LogsFilterParams } from '../types/migration';

export const migrationKeys = {
  all: ['migrations'] as const,
  allStatus: () => [...migrationKeys.all, 'status'] as const,
  tenantStatus: (id: number) => [...migrationKeys.all, 'status', id] as const,
  logs: (params?: LogsFilterParams) => [...migrationKeys.all, 'logs', params] as const,
};

export function useAllMigrationStatus() {
  return useQuery({
    queryKey: migrationKeys.allStatus(),
    queryFn: () => migrationsApi.getAllStatus(),
    staleTime: 30_000,
  });
}

export function useTenantMigrationStatus(tenantId: number) {
  return useQuery({
    queryKey: migrationKeys.tenantStatus(tenantId),
    queryFn: () => migrationsApi.getTenantStatus(tenantId),
    enabled: tenantId > 0,
    staleTime: 15_000,
  });
}

export function useMigrationLogs(params: LogsFilterParams = {}) {
  return useQuery({
    queryKey: migrationKeys.logs(params),
    queryFn: () => migrationsApi.getLogs(params),
    staleTime: 15_000,
  });
}

export function useRunMigrationsForTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: number) => migrationsApi.runForTenant(tenantId),
    onSuccess: (_data, tenantId) => {
      qc.invalidateQueries({ queryKey: migrationKeys.allStatus() });
      qc.invalidateQueries({ queryKey: migrationKeys.tenantStatus(tenantId) });
      qc.invalidateQueries({ queryKey: migrationKeys.logs() });
    },
  });
}

export function useRunAllMigrations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => migrationsApi.runAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: migrationKeys.allStatus() });
      qc.invalidateQueries({ queryKey: migrationKeys.logs() });
    },
  });
}

export function useRevertMigrationForTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: number) => migrationsApi.revertForTenant(tenantId),
    onSuccess: (_data, tenantId) => {
      qc.invalidateQueries({ queryKey: migrationKeys.allStatus() });
      qc.invalidateQueries({ queryKey: migrationKeys.tenantStatus(tenantId) });
      qc.invalidateQueries({ queryKey: migrationKeys.logs() });
    },
  });
}
