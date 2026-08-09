import { apiClient } from './client';
import type {
  Payment,
  PaymentDetail,
  PaginatedPayments,
  BillingSummaryRow,
  ListPaymentsParams,
  CreatePaymentInput,
  UpdatePaymentInput,
  Installment,
  CreateInstallmentInput,
  UpdateInstallmentInput,
} from '../types/payment';

/**
 * `all` is a UI-only sentinel for "no filter" — strip it, along with empty
 * strings, so the server sees an absent param rather than an invalid value.
 */
function toQuery(params: ListPaymentsParams = {}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all',
    ),
  );
}

export const paymentsApi = {
  // ── Obligations ────────────────────────────────────────────────────────────

  list: async (params: ListPaymentsParams = {}): Promise<PaginatedPayments> => {
    const { data } = await apiClient.get('/admin/payments', {
      params: toQuery(params),
    });
    return data;
  },

  summary: async (params: ListPaymentsParams = {}): Promise<BillingSummaryRow[]> => {
    const { data } = await apiClient.get('/admin/payments/summary', {
      params: toQuery(params),
    });
    return data;
  },

  get: async (id: string): Promise<PaymentDetail> => {
    const { data } = await apiClient.get(`/admin/payments/${id}`);
    return data;
  },

  listForTenant: async (tenantId: number): Promise<Payment[]> => {
    const { data } = await apiClient.get(`/admin/tenants/${tenantId}/payments`);
    return data;
  },

  create: async (tenantId: number, input: CreatePaymentInput): Promise<PaymentDetail> => {
    const { data } = await apiClient.post(`/admin/tenants/${tenantId}/payments`, input);
    return data;
  },

  update: async (id: string, input: UpdatePaymentInput): Promise<PaymentDetail> => {
    const { data } = await apiClient.patch(`/admin/payments/${id}`, input);
    return data;
  },

  void: async (id: string, reason: string): Promise<PaymentDetail> => {
    const { data } = await apiClient.post(`/admin/payments/${id}/void`, {
      reason,
    });
    return data;
  },

  remove: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/admin/payments/${id}`);
    return data;
  },

  // ── Tranches ───────────────────────────────────────────────────────────────

  listInstallments: async (paymentId: string): Promise<Installment[]> => {
    const { data } = await apiClient.get(`/admin/payments/${paymentId}/installments`);
    return data;
  },

  addInstallment: async (
    paymentId: string,
    input: CreateInstallmentInput,
  ): Promise<Installment> => {
    const { data } = await apiClient.post(`/admin/payments/${paymentId}/installments`, input);
    return data;
  },

  updateInstallment: async (id: string, input: UpdateInstallmentInput): Promise<Installment> => {
    const { data } = await apiClient.patch(`/admin/installments/${id}`, input);
    return data;
  },

  validateInstallment: async (id: string, validatedBy?: string): Promise<Installment> => {
    const { data } = await apiClient.post(`/admin/installments/${id}/validate`, { validatedBy });
    return data;
  },

  rejectInstallment: async (id: string, reason: string): Promise<Installment> => {
    const { data } = await apiClient.post(`/admin/installments/${id}/reject`, {
      reason,
    });
    return data;
  },

  refundInstallment: async (id: string): Promise<Installment> => {
    const { data } = await apiClient.post(`/admin/installments/${id}/refund`, {});
    return data;
  },

  removeInstallment: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/admin/installments/${id}`);
    return data;
  },
};
