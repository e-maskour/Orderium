import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '../api/tenants';
import { metricsKeys } from './useMetrics';
import type {
  ListTenantsParams,
  CreateTenantInput,
  UpdateTenantInput,
  TenantModulesConfig,
  UpdateTenantSubscriptionInput,
} from '../types/tenant';

export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (params: ListTenantsParams) => [...tenantKeys.lists(), params] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: number) => [...tenantKeys.details(), id] as const,
  stats: (id: number) => [...tenantKeys.all, 'stats', id] as const,
  activity: (id: number) => [...tenantKeys.all, 'activity', id] as const,
  plans: () => ['plans'] as const,
  modules: (id: number) => [...tenantKeys.all, 'modules', id] as const,
  subscription: (id: number) => [...tenantKeys.all, 'subscription', id] as const,
  addonCatalogue: () => ['subscription-addons'] as const,
};

export function useTenants(params: ListTenantsParams = {}) {
  return useQuery({
    queryKey: tenantKeys.list(params),
    queryFn: () => tenantsApi.list(params),
    staleTime: 30_000,
  });
}

export function useTenant(id: number) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: () => tenantsApi.get(id),
    enabled: id > 0,
  });
}

export function useTenantStats(id: number) {
  return useQuery({
    queryKey: tenantKeys.stats(id),
    queryFn: () => tenantsApi.getStats(id),
    enabled: id > 0,
    staleTime: 60_000,
  });
}

export function useTenantActivity(id: number) {
  return useQuery({
    queryKey: tenantKeys.activity(id),
    queryFn: () => tenantsApi.getActivity(id),
    enabled: id > 0,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: tenantKeys.plans(),
    queryFn: () => tenantsApi.listPlans(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTenantInput) => tenantsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenantKeys.lists() }),
  });
}

export function useUpdateTenant(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTenantInput) => tenantsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useActivateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, performedBy }: { id: number; performedBy?: string }) =>
      tenantsApi.activate(id, performedBy),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useDisableTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => tenantsApi.disable(id, reason),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useSuspendTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => tenantsApi.suspend(id, reason),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useArchiveTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      confirmation,
      reason,
    }: {
      id: number;
      confirmation: string;
      reason?: string;
    }) => tenantsApi.archive(id, confirmation, reason),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useUnarchiveTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tenantsApi.unarchive(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useExtendTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, additionalDays }: { id: number; additionalDays: number }) =>
      tenantsApi.extendTrial(id, additionalDays),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      confirmation,
      password,
    }: {
      id: number;
      confirmation: string;
      password: string;
    }) => tenantsApi.deletePermanently(id, confirmation, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenantKeys.lists() }),
  });
}

export function useResetTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      confirmation,
      password,
    }: {
      id: number;
      confirmation: string;
      password: string;
    }) => tenantsApi.resetData(id, confirmation, password),
    onSuccess: (_data, { id }) => qc.invalidateQueries({ queryKey: tenantKeys.stats(id) }),
  });
}

export function useTenantModules(id: number) {
  return useQuery({
    queryKey: tenantKeys.modules(id),
    queryFn: () => tenantsApi.getModules(id),
    enabled: id > 0,
  });
}

export function useUpdateTenantModules(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<TenantModulesConfig>) => tenantsApi.updateModules(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.modules(id) });
    },
  });
}

// ─── Subscription (plan + add-ons) ───────────────────────────────────────────

export function useTenantSubscription(id: number) {
  return useQuery({
    queryKey: tenantKeys.subscription(id),
    queryFn: () => tenantsApi.getSubscription(id),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useAddonCatalogue() {
  return useQuery({
    queryKey: tenantKeys.addonCatalogue(),
    queryFn: () => tenantsApi.getAddonCatalogue(),
    staleTime: 10 * 60_000,
  });
}

/** Changes plan and/or add-ons; the server recomputes limits = plan + add-ons. */
export function useUpdateTenantSubscription(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTenantSubscriptionInput) => tenantsApi.updateSubscription(id, input),
    onSuccess: (data) => {
      qc.setQueryData(tenantKeys.subscription(id), data);
      qc.invalidateQueries({ queryKey: tenantKeys.subscription(id) });
      qc.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
      qc.invalidateQueries({ queryKey: metricsKeys.all });
    },
  });
}
