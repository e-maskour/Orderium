import { apiClient } from './client';
import type {
  FleetRunResult,
  SeederCatalogueEntry,
  SeederLogsFilterParams,
  SeederOptions,
  SeederRunLog,
  TenantSeederStatus,
} from '../types/seeder';

export const seedersApi = {
  getCatalogue: async (): Promise<SeederCatalogueEntry[]> => {
    const { data } = await apiClient.get('/super-admin/seeders/catalogue');
    return data;
  },

  getAllStatus: async (): Promise<TenantSeederStatus[]> => {
    const { data } = await apiClient.get('/super-admin/seeders');
    return data;
  },

  getTenantStatus: async (tenantId: number): Promise<TenantSeederStatus> => {
    const { data } = await apiClient.get(`/super-admin/seeders/${tenantId}`);
    return data;
  },

  runForTenant: async (
    tenantId: number,
    key: string,
    options: SeederOptions = {},
  ): Promise<SeederRunLog> => {
    const { data } = await apiClient.post(`/super-admin/seeders/${tenantId}/run/${key}`, {
      options,
    });
    return data;
  },

  runPendingForTenant: async (
    tenantId: number,
    optionsByKey: Record<string, SeederOptions> = {},
  ): Promise<SeederRunLog[]> => {
    const { data } = await apiClient.post(`/super-admin/seeders/${tenantId}/run-pending`, {
      optionsByKey,
    });
    return data;
  },

  runFleet: async (key: string, options: SeederOptions = {}): Promise<FleetRunResult[]> => {
    const { data } = await apiClient.post(`/super-admin/seeders/run-fleet/${key}`, { options });
    return data;
  },

  getLogs: async (params: SeederLogsFilterParams = {}): Promise<SeederRunLog[]> => {
    const { data } = await apiClient.get('/super-admin/seeders/logs', { params });
    return data;
  },
};
