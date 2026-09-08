import { apiClient } from './client';
import type {
  PlatformOverview,
  PlatformHealth,
  TenantMetricRow,
  TenantSeries,
  CollectionRunResult,
  MetricsRangeParams,
  TenantMetricsListParams,
} from '../types/metrics';

export const metricsApi = {
  overview: async (params: MetricsRangeParams = {}): Promise<PlatformOverview> => {
    const { data } = await apiClient.get('/admin/metrics/overview', { params });
    return data;
  },

  tenants: async (params: TenantMetricsListParams = {}): Promise<TenantMetricRow[]> => {
    const { data } = await apiClient.get('/admin/metrics/tenants', { params });
    return data;
  },

  tenant: async (id: number): Promise<TenantMetricRow> => {
    const { data } = await apiClient.get(`/admin/metrics/tenants/${id}`);
    return data;
  },

  series: async (
    id: number,
    params: MetricsRangeParams & { metrics?: string } = {},
  ): Promise<TenantSeries> => {
    const { data } = await apiClient.get(`/admin/metrics/tenants/${id}/series`, {
      params,
    });
    return data;
  },

  health: async (params: { hours?: number; tenantId?: number } = {}): Promise<PlatformHealth> => {
    const { data } = await apiClient.get('/admin/metrics/health', { params });
    return data;
  },

  status: async (): Promise<{ running: boolean }> => {
    const { data } = await apiClient.get('/admin/metrics/status');
    return data;
  },

  collectAll: async (): Promise<CollectionRunResult> => {
    const { data } = await apiClient.post('/admin/metrics/collect', {});
    return data;
  },

  collectTenant: async (id: number): Promise<unknown> => {
    const { data } = await apiClient.post(`/admin/metrics/tenants/${id}/collect`, {});
    return data;
  },

  /**
   * Downloads the CSV export.
   *
   * Uses a blob + object URL rather than pointing the browser at the endpoint,
   * because the super-admin key travels in a header that a plain navigation
   * cannot set.
   */
  exportCsv: async (params: TenantMetricsListParams = {}): Promise<void> => {
    const response = await apiClient.get('/admin/metrics/tenants/export', {
      params,
      responseType: 'blob',
      // The response is a file, not the JSON envelope the client unwraps.
      transformResponse: (d) => d,
    });
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tenant-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
