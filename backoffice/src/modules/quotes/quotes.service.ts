import {
  QuoteFilters,
  CreateQuoteDTO,
  UpdateQuoteDTO
} from './quotes.interface';
import { QuoteWithDetails } from './quotes.model';

const API_URL = '/api';

export class QuotesService {
  async getAll(filters?: QuoteFilters): Promise<{ quotes: QuoteWithDetails[]; count: number; totalCount: number }> {
    const body: any = {};
    if (filters?.status) body.status = filters.status;
    if (filters?.customerId) body.customerId = filters.customerId;
    if (filters?.dateFrom) body.dateFrom = filters.dateFrom;
    if (filters?.dateTo) body.dateTo = filters.dateTo;
    if (filters?.search) body.search = filters.search;
    
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/quotes/list${queryString ? `?${queryString}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Failed to fetch quotes');
    const data = await response.json();
    const quotes = data.quotes || [];
    return {
      quotes: quotes.map((quote: any) => QuoteWithDetails.fromApiResponse(quote)),
      count: data.count || 0,
      totalCount: data.totalCount || 0,
    };
  }

  async getById(id: number): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/${id}`);
    if (!response.ok) throw new Error('Failed to fetch quote');
    const data = await response.json();
    return QuoteWithDetails.fromApiResponse(data.quote);
  }

  async create(data: CreateQuoteDTO): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create quote');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }

  async update(id: number, data: UpdateQuoteDTO): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update quote');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/quotes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete quote');
    }
  }

  async validate(id: number): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/${id}/validate`, {
      method: 'PUT',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate quote');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }

  async devalidate(id: number): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/${id}/devalidate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to devalidate quote');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }

  async accept(id: number): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/${id}/accept`, {
      method: 'PUT',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to accept quote');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }

  async reject(id: number): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/${id}/reject`, {
      method: 'PUT',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reject quote');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }

  async generateShareLink(id: number): Promise<{ shareToken: string; expiresAt: Date }> {
    const response = await fetch(`${API_URL}/quotes/${id}/share`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate share link');
    }
    const result = await response.json();
    return {
      shareToken: result.shareToken,
      expiresAt: new Date(result.expiresAt),
    };
  }

  async getByShareToken(token: string): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/shared/${token}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch quote');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }

  async signQuote(token: string, signedBy: string, clientNotes?: string): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/shared/${token}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedBy, clientNotes }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sign quote');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }

  async unsignQuote(id: number): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/${id}/unsign`, {
      method: 'PUT',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to unsign quote');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }

  async convertToOrder(id: number, orderId: number): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/${id}/convert-to-order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to convert quote to order');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }

  async convertToInvoice(id: number, invoiceId: number): Promise<QuoteWithDetails> {
    const response = await fetch(`${API_URL}/quotes/${id}/convert-to-invoice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to convert quote to invoice');
    }
    const result = await response.json();
    return QuoteWithDetails.fromApiResponse(result.quote);
  }
}

export const quotesService = new QuotesService();
