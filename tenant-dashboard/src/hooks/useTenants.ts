import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '../api/tenants';
import type {
  ListTenantsParams,
  CreateTenantInput,
  UpdateTenantInput,
  CreatePaymentInput,
  TenantModulesConfig,
} from '../types/tenant';

export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (params: ListTenantsParams) => [...tenantKeys.lists(), params] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: number) => [...tenantKeys.details(), id] as const,
  stats: (id: number) => [...tenantKeys.all, 'stats', id] as const,
  activity: (id: number) => [...tenantKeys.all, 'activity', id] as const,
  payments: (id: number) => [...tenantKeys.all, 'payments', id] as const,
  allPayments: (params?: object) => ['payments', 'all', params] as const,
  plans: () => ['plans'] as const,
  modules: (id: number) => [...tenantKeys.all, 'modules', id] as const,
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

export function useTenantPayments(id: number) {
  return useQuery({
    queryKey: tenantKeys.payments(id),
    queryFn: () => tenantsApi.listPayments(id),
    enabled: id > 0,
  });
}

export function useAllPayments(params?: { status?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: tenantKeys.allPayments(params),
    queryFn: () => tenantsApi.listAllPayments(params),
    staleTime: 30_000,
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
    mutationFn: ({ id, confirmation }: { id: number; confirmation: string }) =>
      tenantsApi.deletePermanently(id, confirmation),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenantKeys.lists() }),
  });
}

export function useCreatePayment(tenantId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => tenantsApi.createPayment(tenantId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.payments(tenantId) });
      qc.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
    },
  });
}

export function useValidatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      validatedBy,
    }: {
      paymentId: string;
      tenantId: number;
      validatedBy?: string;
    }) => tenantsApi.validatePayment(paymentId, validatedBy),
    onSuccess: (_data, { tenantId }) => {
      qc.invalidateQueries({ queryKey: tenantKeys.payments(tenantId) });
      qc.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; tenantId: number; reason: string }) =>
      tenantsApi.rejectPayment(paymentId, reason),
    onSuccess: (_data, { tenantId }) => {
      qc.invalidateQueries({ queryKey: tenantKeys.payments(tenantId) });
    },
  });
}

export function useRefundPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId }: { paymentId: string; tenantId: number }) =>
      tenantsApi.refundPayment(paymentId),
    onSuccess: (_data, { tenantId }) => {
      qc.invalidateQueries({ queryKey: tenantKeys.payments(tenantId) });
    },
  });
}

export function useResetTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmation }: { id: number; confirmation: string }) =>
      tenantsApi.resetData(id, confirmation),
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
