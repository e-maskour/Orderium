import {
  InvoiceFilters,
  InvoiceStatistics,
  CreateInvoiceDTO,
  UpdateInvoiceDTO
} from './invoices.interface';
import { InvoiceWithDetails } from './invoices.model';

const API_URL = '/api';

export class InvoicesService {
  async getAll(filters?: InvoiceFilters): Promise<{ invoices: InvoiceWithDetails[]; count: number; totalCount: number }> {
    const body: any = {};
    if (filters?.status) body.status = filters.status;
    if (filters?.customerId) body.customerId = filters.customerId;
    if (filters?.supplierId) body.supplierId = filters.supplierId;
    if (filters?.dateFrom) body.dateFrom = filters.dateFrom;
    if (filters?.dateTo) body.dateTo = filters.dateTo;
    if (filters?.search) body.search = filters.search;
    
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());
    if (filters?.direction) params.append('direction', filters.direction);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/invoices/list${queryString ? `?${queryString}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Failed to fetch invoices');
    const data = await response.json();
    const invoices = data.invoices || [];
    return {
      invoices: invoices.map((inv: any) => InvoiceWithDetails.fromApiResponse(inv)),
      count: data.count || 0,
      totalCount: data.totalCount || 0,
    };
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

  async validate(id: number): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices/${id}/validate`, {
      method: 'PUT',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate invoice');
    }
    const result = await response.json();
    return InvoiceWithDetails.fromApiResponse(result.invoice);
  }

  async devalidate(id: number): Promise<InvoiceWithDetails> {
    const response = await fetch(`${API_URL}/invoices/${id}/devalidate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to devalidate invoice');
    }
    const result = await response.json();
    return InvoiceWithDetails.fromApiResponse(result.invoice);
  }

  async getAnalytics(direction: 'vente' | 'achat', year: number): Promise<any> {
    const response = await fetch(`${API_URL}/invoices/analytics/${direction}?year=${year}`);
    if (!response.ok) throw new Error('Failed to fetch invoice analytics');
    const result = await response.json();
    return result.data;
  }

  async exportToXlsx(supplierId?: number): Promise<Blob> {
    const params = new URLSearchParams();
    if (supplierId !== undefined) params.append('supplierId', supplierId.toString());
    const response = await fetch(`${API_URL}/invoices/export/xlsx${params.toString() ? '?' + params.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to export invoices');
    return response.blob();
  }
}

export const invoicesService = new InvoicesService();
