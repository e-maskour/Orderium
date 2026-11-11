import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../api/leads';
import type { ListLeadsParams, UpdateLeadInput } from '../types/lead';
import { useApiKey } from '../components/ApiKeyDialog';

export const leadKeys = {
  all: ['leads'] as const,
  list: (params: ListLeadsParams) => [...leadKeys.all, 'list', params] as const,
};

export function useLeads(params: ListLeadsParams = {}) {
  const key = useApiKey();
  return useQuery({
    queryKey: leadKeys.list(params),
    queryFn: () => leadsApi.list(params),
    enabled: Boolean(key),
    staleTime: 15_000,
    refetchInterval: 60_000, // new leads show up without a reload
  });
}

/** Count of leads still waiting for a first contact (sidebar badge). */
export function useNewLeadsCount(): number {
  const { data } = useLeads({ pageSize: 1 });
  return data?.counts.new ?? 0;
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateLeadInput }) =>
      leadsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => leadsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}
