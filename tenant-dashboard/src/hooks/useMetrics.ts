import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { metricsApi } from '../api/metrics';
import type { MetricsRangeParams, TenantMetricsListParams } from '../types/metrics';

export const metricsKeys = {
  all: ['metrics'] as const,
  overview: (params: MetricsRangeParams) => [...metricsKeys.all, 'overview', params] as const,
  tenants: (params: TenantMetricsListParams) => [...metricsKeys.all, 'tenants', params] as const,
  tenant: (id: number) => [...metricsKeys.all, 'tenant', id] as const,
  series: (id: number, params: object) => [...metricsKeys.all, 'series', id, params] as const,
  health: (params: object) => [...metricsKeys.all, 'health', params] as const,
};

/**
 * Snapshot data changes once a night, so a long stale time avoids pointless
 * refetching. Usage counters flush every two minutes, which is what the
 * one-minute stale time on health and overview is sized for.
 */
export function useMetricsOverview(params: MetricsRangeParams = {}) {
  return useQuery({
    queryKey: metricsKeys.overview(params),
    queryFn: () => metricsApi.overview(params),
    staleTime: 60_000,
  });
}

export function useTenantMetrics(params: TenantMetricsListParams = {}) {
  return useQuery({
    queryKey: metricsKeys.tenants(params),
    queryFn: () => metricsApi.tenants(params),
    staleTime: 60_000,
  });
}

export function useTenantMetric(id: number) {
  return useQuery({
    queryKey: metricsKeys.tenant(id),
    queryFn: () => metricsApi.tenant(id),
    enabled: id > 0,
    staleTime: 60_000,
  });
}

export function useTenantSeries(
  id: number,
  params: MetricsRangeParams & { metrics?: string } = {},
) {
  return useQuery({
    queryKey: metricsKeys.series(id, params),
    queryFn: () => metricsApi.series(id, params),
    enabled: id > 0,
    staleTime: 60_000,
  });
}

export function usePlatformHealth(params: { hours?: number; tenantId?: number } = {}) {
  return useQuery({
    queryKey: metricsKeys.health(params),
    queryFn: () => metricsApi.health(params),
    staleTime: 60_000,
    // Health is the one view an operator watches during an incident.
    refetchInterval: 60_000,
  });
}

export function useCollectMetrics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => metricsApi.collectAll(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: metricsKeys.all });
      if (result.tenantsFailed > 0) {
        toast.error(`Collected ${result.tenantsProcessed} tenants, ${result.tenantsFailed} failed`);
      } else {
        toast.success(
          `Collected ${result.tenantsProcessed} tenants in ${(result.durationMs / 1000).toFixed(1)}s`,
        );
      }
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message ?? 'Collection failed');
    },
  });
}

export function useCollectTenantMetrics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => metricsApi.collectTenant(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: metricsKeys.all });
      toast.success('Metrics refreshed');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message ?? 'Refresh failed');
    },
  });
}

export function useExportMetrics() {
  return useMutation({
    mutationFn: (params: TenantMetricsListParams) => metricsApi.exportCsv(params),
    onSuccess: () => toast.success('Export downloaded'),
    onError: () => toast.error('Export failed'),
  });
}
