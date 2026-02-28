import { PaymentFilters, CreatePaymentDTO, UpdatePaymentDTO } from './payments.interface';
import { Payment } from './payments.model';
import { apiClient, API_ROUTES } from '../../common';

export class PaymentsService {
  async getAll(filters?: PaymentFilters): Promise<Payment[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.invoiceId) params.invoiceId = filters.invoiceId;
    if (filters?.customerId) params.customerId = filters.customerId;
    if (filters?.supplierId) params.supplierId = filters.supplierId;
    if (filters?.paymentType) params.paymentType = filters.paymentType;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;

    const response = await apiClient.get<any[]>(API_ROUTES.PAYMENTS.LIST, { params });
    return (response.data || []).map((p: any) => Payment.fromApiResponse(p));
  }

  async getByInvoice(invoiceId: number): Promise<Payment[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.PAYMENTS.LIST, { params: { invoiceId } });
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
