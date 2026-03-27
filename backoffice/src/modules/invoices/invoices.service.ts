import {
  InvoiceFilters,
  InvoiceStatistics,
  CreateInvoiceDTO,
  UpdateInvoiceDTO
} from './invoices.interface';
import { InvoiceWithDetails } from './invoices.model';
import { apiClient, API_ROUTES } from '../../common';

export class InvoicesService {
  async getAll(filters?: InvoiceFilters): Promise<{ invoices: InvoiceWithDetails[]; count: number; totalCount: number }> {
    const body: any = {};
    if (filters?.status) body.status = filters.status;
    if (filters?.customerId) body.customerId = filters.customerId;
    if (filters?.supplierId) body.supplierId = filters.supplierId;
    if (filters?.dateFrom) body.dateFrom = filters.dateFrom;
    if (filters?.dateTo) body.dateTo = filters.dateTo;
    if (filters?.search) body.search = filters.search;

    const queryParams: Record<string, string | number | boolean | undefined> = {};
    if (filters?.page) queryParams.page = filters.page;
    if (filters?.pageSize) queryParams.pageSize = filters.pageSize;
    if (filters?.direction) queryParams.direction = filters.direction;

    const response = await apiClient.post<any[]>(API_ROUTES.INVOICES.LIST, body, { params: queryParams });
    const invoices = response.data || [];
    return {
      invoices: invoices.map((inv: any) => InvoiceWithDetails.fromApiResponse(inv)),
      count: (response.metadata as any)?.total || 0,
      totalCount: (response.metadata as any)?.total || 0,
    };
  }

  async getById(id: number): Promise<InvoiceWithDetails> {
    const response = await apiClient.get<any>(API_ROUTES.INVOICES.DETAIL(id));
    return InvoiceWithDetails.fromApiResponse(response.data);
  }

  async create(data: CreateInvoiceDTO): Promise<InvoiceWithDetails> {
    const response = await apiClient.post<any>(API_ROUTES.INVOICES.CREATE, data);
    return InvoiceWithDetails.fromApiResponse(response.data);
  }

  async update(id: number, data: UpdateInvoiceDTO): Promise<InvoiceWithDetails> {
    const response = await apiClient.put<any>(API_ROUTES.INVOICES.UPDATE(id), data);
    return InvoiceWithDetails.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.INVOICES.DELETE(id));
  }

  async getStatistics(filters?: InvoiceFilters): Promise<InvoiceStatistics> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.customerId) params.customerId = filters.customerId;
    if (filters?.supplierId) params.supplierId = filters.supplierId;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;

    const response = await apiClient.get<InvoiceStatistics>(API_ROUTES.INVOICES.STATISTICS, { params });
    return response.data;
  }

  async getOverdue(): Promise<InvoiceWithDetails[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.INVOICES.OVERDUE);
    return (response.data || []).map((inv: any) => InvoiceWithDetails.fromApiResponse(inv));
  }

  async validate(id: number): Promise<InvoiceWithDetails> {
    const response = await apiClient.put<any>(API_ROUTES.INVOICES.VALIDATE(id));
    return InvoiceWithDetails.fromApiResponse(response.data);
  }

  async devalidate(id: number): Promise<InvoiceWithDetails> {
    const response = await apiClient.put<any>(API_ROUTES.INVOICES.DEVALIDATE(id));
    return InvoiceWithDetails.fromApiResponse(response.data);
  }

  async getAnalytics(direction: 'vente' | 'achat', year: number): Promise<any> {
    const response = await apiClient.get<any>(API_ROUTES.INVOICES.ANALYTICS(direction), { params: { year } });
    return response.data;
  }

  async exportToXlsx(supplierId?: number): Promise<Blob> {
    const raw = await apiClient.raw('GET', API_ROUTES.INVOICES.EXPORT_XLSX, {
      params: supplierId !== undefined ? { supplierId } : undefined,
    });
    return raw.blob();
  }

  async generateShareLink(id: number): Promise<{ shareToken: string; expiresAt: Date }> {
    const result = await apiClient.post<any>(API_ROUTES.INVOICES.SHARE(id));
    return {
      shareToken: result.data.shareToken,
      expiresAt: new Date(result.data.expiresAt),
    };
  }

  async getByShareToken(token: string): Promise<any> {
    const response = await apiClient.get<any>(API_ROUTES.INVOICES.SHARED(token));
    return response.data;
  }

  async revokeShareLink(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.INVOICES.SHARE(id));
  }
}

export const invoicesService = new InvoicesService();
