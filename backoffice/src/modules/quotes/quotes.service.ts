import { QuoteFilters, CreateQuoteDTO, UpdateQuoteDTO } from './quotes.interface';
import { QuoteWithDetails } from './quotes.model';
import { apiClient, API_ROUTES } from '../../common';

export class QuotesService {
  async getAll(
    filters?: QuoteFilters,
  ): Promise<{ quotes: QuoteWithDetails[]; count: number; totalCount: number }> {
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

    const response = await apiClient.post<any[]>(API_ROUTES.QUOTES.LIST, body, {
      params: queryParams,
    });
    const quotes = response.data || [];
    return {
      quotes: quotes.map((quote: any) => QuoteWithDetails.fromApiResponse(quote)),
      count: (response.metadata as any)?.total || 0,
      totalCount: (response.metadata as any)?.total || 0,
    };
  }

  async getAggregates(
    filters?: QuoteFilters,
  ): Promise<{ totalAmount: number; totalPaid: number; totalRemaining: number }> {
    const body: any = {};
    if (filters?.status) body.status = filters.status;
    if (filters?.customerId) body.customerId = filters.customerId;
    if (filters?.supplierId) body.supplierId = filters.supplierId;
    if (filters?.dateFrom) body.dateFrom = filters.dateFrom;
    if (filters?.dateTo) body.dateTo = filters.dateTo;
    if (filters?.search) body.search = filters.search;

    const queryParams: Record<string, string | number | boolean | undefined> = {};
    if (filters?.direction) queryParams.direction = filters.direction;

    const response = await apiClient.post<any>(API_ROUTES.QUOTES.AGGREGATES, body, {
      params: queryParams,
    });
    return (response.data as any) || { totalAmount: 0, totalPaid: 0, totalRemaining: 0 };
  }

  async getById(id: number): Promise<QuoteWithDetails> {
    const response = await apiClient.get<any>(API_ROUTES.QUOTES.DETAIL(id));
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async create(data: CreateQuoteDTO): Promise<QuoteWithDetails> {
    const response = await apiClient.post<any>(API_ROUTES.QUOTES.CREATE, data);
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async update(id: number, data: UpdateQuoteDTO): Promise<QuoteWithDetails> {
    const response = await apiClient.patch<any>(API_ROUTES.QUOTES.UPDATE(id), data);
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.QUOTES.DELETE(id));
  }

  async validate(id: number): Promise<QuoteWithDetails> {
    const response = await apiClient.put<any>(API_ROUTES.QUOTES.VALIDATE(id));
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async devalidate(id: number): Promise<QuoteWithDetails> {
    const response = await apiClient.put<any>(API_ROUTES.QUOTES.DEVALIDATE(id));
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async accept(id: number): Promise<QuoteWithDetails> {
    const response = await apiClient.put<any>(API_ROUTES.QUOTES.ACCEPT(id));
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async reject(id: number): Promise<QuoteWithDetails> {
    const response = await apiClient.put<any>(API_ROUTES.QUOTES.REJECT(id));
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async generateShareLink(id: number): Promise<{ shareToken: string; expiresAt: Date }> {
    const result = await apiClient.post<any>(API_ROUTES.QUOTES.SHARE(id));
    return {
      shareToken: result.data.shareToken,
      expiresAt: new Date(result.data.expiresAt),
    };
  }

  async getByShareToken(token: string): Promise<QuoteWithDetails> {
    const response = await apiClient.get<any>(API_ROUTES.QUOTES.SHARED(token));
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async signQuote(
    token: string,
    signedBy: string,
    clientNotes?: string,
  ): Promise<QuoteWithDetails> {
    const response = await apiClient.post<any>(API_ROUTES.QUOTES.SHARED_SIGN(token), {
      signedBy,
      clientNotes,
    });
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async unsignQuote(id: number): Promise<QuoteWithDetails> {
    const response = await apiClient.put<any>(API_ROUTES.QUOTES.UNSIGN(id));
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async convertToOrder(id: number, orderId: number): Promise<QuoteWithDetails> {
    const response = await apiClient.put<any>(API_ROUTES.QUOTES.CONVERT_TO_ORDER(id), { orderId });
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async convertToInvoice(id: number, invoiceId: number): Promise<QuoteWithDetails> {
    const response = await apiClient.put<any>(API_ROUTES.QUOTES.CONVERT_TO_INVOICE(id), {
      invoiceId,
    });
    return QuoteWithDetails.fromApiResponse(response.data);
  }

  async getAnalytics(direction: 'vente' | 'achat', year: number): Promise<any> {
    const response = await apiClient.get<any>(API_ROUTES.QUOTES.ANALYTICS(direction), {
      params: { year },
    });
    return response.data;
  }

  async exportToXlsx(supplierId?: number): Promise<Blob> {
    const raw = await apiClient.raw('GET', API_ROUTES.QUOTES.EXPORT_XLSX, {
      params: supplierId !== undefined ? { supplierId } : undefined,
    });
    return raw.blob();
  }
}

export const quotesService = new QuotesService();
