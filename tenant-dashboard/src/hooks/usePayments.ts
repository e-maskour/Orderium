import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../api/payments';
import { tenantKeys } from './useTenants';
import type {
  ListPaymentsParams,
  CreatePaymentInput,
  UpdatePaymentInput,
  CreateInstallmentInput,
  UpdateInstallmentInput,
} from '../types/payment';

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (params: ListPaymentsParams) => [...paymentKeys.lists(), params] as const,
  summary: (params: ListPaymentsParams) => [...paymentKeys.all, 'summary', params] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  forTenant: (tenantId: number) => [...paymentKeys.all, 'tenant', tenantId] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function usePayments(params: ListPaymentsParams = {}) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => paymentsApi.list(params),
    staleTime: 30_000,
  });
}

export function usePaymentsSummary(params: ListPaymentsParams = {}) {
  return useQuery({
    queryKey: paymentKeys.summary(params),
    queryFn: () => paymentsApi.summary(params),
    staleTime: 30_000,
  });
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: paymentKeys.detail(id ?? ''),
    queryFn: () => paymentsApi.get(id as string),
    enabled: !!id,
  });
}

export function useTenantPayments(tenantId: number) {
  return useQuery({
    queryKey: paymentKeys.forTenant(tenantId),
    queryFn: () => paymentsApi.listForTenant(tenantId),
    enabled: tenantId > 0,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Every write can move a derived balance, and settling an obligation in full
 * also flips the tenant onto its paid plan — so tenant queries are invalidated
 * alongside the payment ones rather than only the row that was touched.
 */
function useInvalidatePayments() {
  const qc = useQueryClient();
  return (opts: { paymentId?: string; tenantId?: number } = {}) => {
    qc.invalidateQueries({ queryKey: paymentKeys.all });
    if (opts.paymentId) {
      qc.invalidateQueries({ queryKey: paymentKeys.detail(opts.paymentId) });
    }
    if (opts.tenantId) {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(opts.tenantId) });
      qc.invalidateQueries({ queryKey: tenantKeys.activity(opts.tenantId) });
    }
    qc.invalidateQueries({ queryKey: tenantKeys.lists() });
  };
}

export function useCreatePayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ tenantId, input }: { tenantId: number; input: CreatePaymentInput }) =>
      paymentsApi.create(tenantId, input),
    onSuccess: (_d, { tenantId }) => invalidate({ tenantId }),
  });
}

export function useUpdatePayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePaymentInput }) =>
      paymentsApi.update(id, input),
    onSuccess: (data) => invalidate({ paymentId: data.id, tenantId: data.tenantId }),
  });
}

export function useVoidPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => paymentsApi.void(id, reason),
    onSuccess: (data) => invalidate({ paymentId: data.id, tenantId: data.tenantId }),
  });
}

export function useDeletePayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id }: { id: string; tenantId?: number }) => paymentsApi.remove(id),
    onSuccess: (_d, { tenantId }) => invalidate({ tenantId }),
  });
}

export function useAddInstallment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ paymentId, input }: { paymentId: string; input: CreateInstallmentInput }) =>
      paymentsApi.addInstallment(paymentId, input),
    onSuccess: (data) => invalidate({ paymentId: data.paymentId, tenantId: data.tenantId }),
  });
}

export function useUpdateInstallment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInstallmentInput }) =>
      paymentsApi.updateInstallment(id, input),
    onSuccess: (data) => invalidate({ paymentId: data.paymentId, tenantId: data.tenantId }),
  });
}

export function useValidateInstallment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id, validatedBy }: { id: string; validatedBy?: string }) =>
      paymentsApi.validateInstallment(id, validatedBy),
    onSuccess: (data) => invalidate({ paymentId: data.paymentId, tenantId: data.tenantId }),
  });
}

export function useRejectInstallment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      paymentsApi.rejectInstallment(id, reason),
    onSuccess: (data) => invalidate({ paymentId: data.paymentId, tenantId: data.tenantId }),
  });
}

export function useRefundInstallment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => paymentsApi.refundInstallment(id),
    onSuccess: (data) => invalidate({ paymentId: data.paymentId, tenantId: data.tenantId }),
  });
}

export function useDeleteInstallment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id }: { id: string; paymentId?: string }) => paymentsApi.removeInstallment(id),
    onSuccess: (_d, { paymentId }) => invalidate({ paymentId }),
  });
}
