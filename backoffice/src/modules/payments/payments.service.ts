import { PaymentFilters, CreatePaymentDTO, UpdatePaymentDTO } from './payments.interface';
import { Payment } from './payments.model';
import { apiClient, API_ROUTES } from '../../common';

export class PaymentsService {
  private buildParams(filters?: PaymentFilters) {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.invoiceId) params.invoiceId = filters.invoiceId;
    if (filters?.customerId) params.customerId = filters.customerId;
    if (filters?.supplierId) params.supplierId = filters.supplierId;
    if (filters?.paymentType && filters.paymentType !== 'all')
      params.paymentType = filters.paymentType;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.search?.trim()) params.search = filters.search.trim();
    if (filters?.direction) params.direction = filters.direction;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.sortField) params.sortField = filters.sortField;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;
    return params;
  }

  /** All matching payments (no pagination unless page/limit are passed). */
  async getAll(filters?: PaymentFilters): Promise<Payment[]> {
    return (await this.getPage(filters)).payments;
  }

  /**
   * Server-filtered (and optionally paginated) payments. `total` and
   * `totalAmount` describe the whole filtered set, not just the page.
   */
  async getPage(
    filters?: PaymentFilters,
  ): Promise<{ payments: Payment[]; total: number; totalAmount: number }> {
    const response = await apiClient.get<any[]>(API_ROUTES.PAYMENTS.LIST, {
      params: this.buildParams(filters),
    });
    const payments = (response.data || []).map((p: any) => Payment.fromApiResponse(p));
    const meta = (response.metadata ?? {}) as { total?: number; totalAmount?: number };
    return {
      payments,
      total: meta.total ?? payments.length,
      totalAmount: meta.totalAmount ?? payments.reduce((s, p) => s + (p.amount || 0), 0),
    };
  }

  async getByInvoice(invoiceId: number): Promise<Payment[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.PAYMENTS.LIST, {
      params: { invoiceId },
    });
    return (response.data || []).map((p: any) => Payment.fromApiResponse(p));
  }

  async getTotalPaid(invoiceId: number): Promise<number> {
    const response = await apiClient.get<number>(API_ROUTES.PAYMENTS.INVOICE_TOTAL(invoiceId));
    return response.data;
  }

  async getById(id: number): Promise<Payment> {
    const response = await apiClient.get<any>(API_ROUTES.PAYMENTS.DETAIL(id));
    return Payment.fromApiResponse(response.data);
  }

  async create(data: CreatePaymentDTO): Promise<Payment> {
    const response = await apiClient.post<any>(API_ROUTES.PAYMENTS.CREATE, data);
    return Payment.fromApiResponse(response.data);
  }

  async update(id: number, data: UpdatePaymentDTO): Promise<Payment> {
    const response = await apiClient.patch<any>(API_ROUTES.PAYMENTS.UPDATE(id), data);
    return Payment.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.PAYMENTS.DELETE(id));
  }
}

export const paymentsService = new PaymentsService();
