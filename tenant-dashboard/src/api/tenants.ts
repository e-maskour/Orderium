import { apiClient } from './client';
import type {
  Tenant,
  CreateTenantResponse,
  TenantStats,
  PaginatedTenants,
  ListTenantsParams,
  CreateTenantInput,
  UpdateTenantInput,
  SubscriptionPlanData,
  ActivityLogEntry,
  TenantModulesConfig,
} from '../types/tenant';

export const tenantsApi = {
  list: async (params: ListTenantsParams = {}): Promise<PaginatedTenants> => {
    const { data } = await apiClient.get('/admin/tenants', { params });
    return data;
  },

  get: async (id: number): Promise<Tenant> => {
    const { data } = await apiClient.get(`/admin/tenants/${id}`);
    return data;
  },

  getStats: async (id: number): Promise<TenantStats> => {
    const { data } = await apiClient.get(`/admin/tenants/${id}/stats`);
    return data;
  },

  create: async (input: CreateTenantInput): Promise<CreateTenantResponse> => {
    const { data } = await apiClient.post('/admin/tenants', input);
    return data;
  },

  update: async (id: number, input: UpdateTenantInput): Promise<Tenant> => {
    const { data } = await apiClient.patch(`/admin/tenants/${id}`, input);
    return data;
  },

  resetData: async (id: number, confirmation: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post(`/admin/tenants/${id}/reset`, { confirmation });
    return data;
  },

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  activate: async (id: number, performedBy?: string): Promise<Tenant> => {
    const { data } = await apiClient.post(`/admin/tenants/${id}/activate`, { performedBy });
    return data;
  },

  disable: async (id: number, reason: string, performedBy?: string): Promise<Tenant> => {
    const { data } = await apiClient.post(`/admin/tenants/${id}/disable`, { reason, performedBy });
    return data;
  },

  suspend: async (id: number, reason: string, performedBy?: string): Promise<Tenant> => {
    const { data } = await apiClient.post(`/admin/tenants/${id}/suspend`, { reason, performedBy });
    return data;
  },

  archive: async (id: number, confirmation: string, reason?: string): Promise<Tenant> => {
    const { data } = await apiClient.post(`/admin/tenants/${id}/archive`, { confirmation, reason });
    return data;
  },

  unarchive: async (id: number): Promise<Tenant> => {
    const { data } = await apiClient.post(`/admin/tenants/${id}/unarchive`, {});
    return data;
  },

  deletePermanently: async (id: number, confirmation: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/admin/tenants/${id}/permanent`, {
      data: { confirmation },
    });
    return data;
  },

  extendTrial: async (id: number, additionalDays: number): Promise<Tenant> => {
    const { data } = await apiClient.post(`/admin/tenants/${id}/extend-trial`, { additionalDays });
    return data;
  },

  // ── Activity log ───────────────────────────────────────────────────────────

  getActivity: async (id: number): Promise<ActivityLogEntry[]> => {
    const { data } = await apiClient.get(`/admin/tenants/${id}/activity`);
    return data;
  },

  // ── Plans ──────────────────────────────────────────────────────────────────

  listPlans: async (): Promise<SubscriptionPlanData[]> => {
    const { data } = await apiClient.get('/admin/plans');
    return data;
  },

  // ── Modules ────────────────────────────────────────────────────────────────

  getModules: async (id: number): Promise<TenantModulesConfig> => {
    const { data } = await apiClient.get(`/admin/tenants/${id}/modules`);
    return data;
  },

  updateModules: async (
    id: number,
    input: Partial<TenantModulesConfig>,
  ): Promise<TenantModulesConfig> => {
    const { data } = await apiClient.patch(`/admin/tenants/${id}/modules`, input);
    return data;
  },
};
