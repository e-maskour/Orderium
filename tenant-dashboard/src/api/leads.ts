import { apiClient } from './client';
import type { Lead, LeadList, ListLeadsParams, UpdateLeadInput } from '../types/lead';

export const leadsApi = {
  list: async (params: ListLeadsParams = {}): Promise<LeadList> => {
    const query = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'all'),
    );
    const { data } = await apiClient.get('/admin/leads', { params: query });
    return data;
  },

  update: async (id: number, input: UpdateLeadInput): Promise<Lead> => {
    const { data } = await apiClient.patch(`/admin/leads/${id}`, input);
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/leads/${id}`);
  },
};
