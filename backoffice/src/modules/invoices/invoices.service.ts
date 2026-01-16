import {
  InvoiceFilters,
  InvoiceStatistics,
  CreateInvoiceDTO,
  UpdateInvoiceDTO
} from './invoices.interface';
import { InvoiceWithDetails } from './invoices.model';

const API_URL = '/api';

export class InvoicesService {
  async getAll(filters?: InvoiceFilters): Promise<InvoiceWithDetails[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customerId) params.append('customerId', filters.customerId.toString());
    if (filters?.supplierId) params.append('supplierId', filters.supplierId.toString());
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/invoices${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch invoices');
    const data = await response.json();
    const invoices = data.invoices || [];
    return invoices.map((inv: any) => InvoiceWithDetails.fromApiResponse(inv));
  }

  async getById(id: number): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices/${id}`);
    if (!response.ok) throw new Error('Failed to fetch invoice');
    const data = await response.json();
    return InvoiceWithDetails.fromApiResponse(data.invoice);
  }

  async create(data: CreateInvoiceDTO): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create invoice');
    }
    const result = await response.json();
    return InvoiceWithDetails.fromApiResponse(result.invoice);
  }

  async update(id: number, data: UpdateInvoiceDTO): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update invoice');
    }
    const result = await response.json();
    return InvoiceWithDetails.fromApiResponse(result.invoice);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/invoices/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete invoice');
    }
  }

  async getStatistics(filters?: InvoiceFilters): Promise<InvoiceStatistics> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customerId) params.append('customerId', filters.customerId.toString());
    if (filters?.supplierId) params.append('supplierId', filters.supplierId.toString());
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/invoices/statistics${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch invoice statistics');
    const data = await response.json();
    return data.statistics;
  }

  async getOverdue(): Promise<InvoiceWithDetails[]> {
    const response = await fetch(`${API_URL}/invoices/overdue`);
    if (!response.ok) throw new Error('Failed to fetch overdue invoices');
    const data = await response.json();
    const invoices = data.invoices || [];
    return invoices.map((inv: any) => InvoiceWithDetails.fromApiResponse(inv));
  }
}

export const invoicesService = new InvoicesService();
