import { PaymentFilters, CreatePaymentDTO, UpdatePaymentDTO } from './payments.interface';
import { Payment } from './payments.model';

const API_URL = '/api';

export class PaymentsService {
  async getAll(filters?: PaymentFilters): Promise<Payment[]> {
    const params = new URLSearchParams();
    if (filters?.invoiceId) params.append('invoiceId', filters.invoiceId.toString());
    if (filters?.customerId) params.append('customerId', filters.customerId.toString());
    if (filters?.supplierId) params.append('supplierId', filters.supplierId.toString());
    if (filters?.paymentType) params.append('paymentType', filters.paymentType);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/payments${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch payments');
    const data = await response.json();
    return Array.isArray(data) ? data.map(p => Payment.fromApiResponse(p)) : [];
  }

  async getByInvoice(invoiceId: number): Promise<Payment[]> {
    const response = await fetch(`${API_URL}/payments?invoiceId=${invoiceId}`);
    if (!response.ok) throw new Error('Failed to fetch payments');
    const data = await response.json();
    return Array.isArray(data) ? data.map(p => Payment.fromApiResponse(p)) : [];
  }

  async getTotalPaid(invoiceId: number): Promise<number> {
    const response = await fetch(`${API_URL}/payments/invoice/${invoiceId}/total`);
    if (!response.ok) throw new Error('Failed to fetch total paid');
    return await response.json();
  }

  async getById(id: number): Promise<Payment> {
    const response = await fetch(`${API_URL}/payments/${id}`);
    if (!response.ok) throw new Error('Failed to fetch payment');
    const data = await response.json();
    return Payment.fromApiResponse(data);
  }

  async create(data: CreatePaymentDTO): Promise<Payment> {
    const response = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create payment');
    }
    const result = await response.json();
    return Payment.fromApiResponse(result);
  }

  async update(id: number, data: UpdatePaymentDTO): Promise<Payment> {
    const response = await fetch(`${API_URL}/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update payment');
    }
    const result = await response.json();
    return Payment.fromApiResponse(result);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/payments/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete payment');
    }
  }
}

export const paymentsService = new PaymentsService();
