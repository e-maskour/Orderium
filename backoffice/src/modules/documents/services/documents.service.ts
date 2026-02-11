import { DocumentType, DocumentDirection } from '../types';
import { invoicesService } from '../../invoices/invoices.service';
import { quotesService } from '../../quotes/quotes.service';
import { ordersService } from '../../orders/orders.service';
import { InvoiceWithDetails } from '../../invoices/invoices.model';
import { QuoteWithDetails } from '../../quotes/quotes.model';
import { Order } from '../../orders/orders.model';

export interface DocumentItem {
  id: number;
  number: string;
  date: string;
  dueDate?: string;
  validationDate?: string | null;
  partnerName: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  isValidated: boolean;
  itemsCount: number;
}

export interface DocumentFilters {
  search?: string;
  status?: string;
  partnerId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface DocumentsResult {
  documents: DocumentItem[];
  count: number;
  totalCount: number;
}

export class DocumentsService {
  async getDocuments(
    type: DocumentType,
    direction: DocumentDirection,
    filters?: DocumentFilters
  ): Promise<DocumentsResult> {
    if (type === 'facture') {
      const isVente = direction === 'vente';
      const invoiceFilters = {
        search: filters?.search,
        status: filters?.status !== 'all' ? filters?.status : undefined,
        customerId: isVente && filters?.partnerId ? filters.partnerId : undefined,
        supplierId: !isVente && filters?.partnerId ? filters.partnerId : undefined,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        page: filters?.page,
        pageSize: filters?.pageSize,
      };
      
      const result = await invoicesService.getAll(invoiceFilters);
      const invoices = result.invoices || [];
      
      const filtered = invoices.filter(inv => 
        isVente ? inv.invoice.customerId : inv.invoice.supplierId
      );
      
      const transformed = this.transformInvoicesToDocuments(filtered, isVente);
      
      return {
        documents: transformed,
        count: result.count,
        totalCount: result.totalCount
      };
    } else if (type === 'devis') {
      const isVente = direction === 'vente';
      const quoteFilters = {
        search: filters?.search,
        status: filters?.status !== 'all' ? filters?.status : undefined,
        customerId: isVente && filters?.partnerId ? filters.partnerId : undefined,
        supplierId: !isVente && filters?.partnerId ? filters.partnerId : undefined,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        page: filters?.page,
        pageSize: filters?.pageSize,
      };
      
      const result = await quotesService.getAll(quoteFilters);
      const quotes = result.quotes || [];
      
      // Filter quotes based on direction
      const filtered = quotes.filter(q => 
        isVente ? q.quote.customerId : q.quote.supplierId
      );
      
      const transformed = this.transformQuotesToDocuments(filtered, isVente);
      
      return {
        documents: transformed,
        count: filtered.length,
        totalCount: filtered.length
      };
    } else if (type === 'bon_livraison') {
      const isVente = direction === 'vente';
      // Fetch only orders NOT created from portal (fromPortal = false)
      const result = await ordersService.getAll(
        filters?.search,
        filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
        filters?.dateTo ? new Date(filters.dateTo) : undefined,
        false,
        filters?.status !== 'all' ? filters?.status : undefined,
        undefined,
        undefined,
        filters?.page,
        filters?.pageSize
      );
      
      // Filter orders based on direction
      const allOrders = result.orders || [];
      const filtered = allOrders.filter(order => 
        isVente ? order.customerId : order.supplierId
      );
      
      const transformed = this.transformOrdersToDocuments(filtered, isVente);
      
      return {
        documents: transformed,
        count: filtered.length,
        totalCount: filtered.length
      };
    }
    
    return { documents: [], count: 0, totalCount: 0 };
  }

  async validateDocument(type: DocumentType, id: number): Promise<void> {
    if (type === 'facture') {
      await invoicesService.validate(id);
    } else if (type === 'devis') {
      await quotesService.validate(id);
    } else if (type === 'bon_livraison') {
      await ordersService.validate(id);
    }
  }

  async devalidateDocument(type: DocumentType, id: number): Promise<void> {
    if (type === 'facture') {
      await invoicesService.devalidate(id);
    } else if (type === 'devis') {
      await quotesService.devalidate(id);
    } else if (type === 'bon_livraison') {
      await ordersService.devalidate(id);
    }
  }

  async deleteDocument(type: DocumentType, id: number): Promise<void> {
    if (type === 'facture') {
      await invoicesService.delete(id);
    } else if (type === 'devis') {
      await quotesService.delete(id);
    } else if (type === 'bon_livraison') {
      await ordersService.delete(id);
    }
  }

  private transformInvoicesToDocuments(
    invoices: InvoiceWithDetails[],
    isVente: boolean
  ): DocumentItem[] {
    return invoices.map(inv => ({
      id: inv.invoice.id,
      number: inv.invoice.invoiceNumber,
      date: inv.invoice.date,
      dueDate: inv.invoice.dueDate || undefined,
      validationDate: inv.invoice.validationDate || null,
      partnerName: (isVente ? inv.invoice.customerName : inv.invoice.supplierName) || 'Inconnu',
      subtotal: inv.invoice.subtotal,
      tax: inv.invoice.tax,
      total: inv.invoice.total,
      paidAmount: inv.invoice.paidAmount || 0,
      remainingAmount: inv.invoice.remainingAmount || 0,
      status: this.mapInvoiceStatus(inv.invoice.status, inv.invoice.dueDate),
      isValidated: inv.invoice.isValidated,
      itemsCount: inv.items.length
    }));
  }

  private transformQuotesToDocuments(quotes: QuoteWithDetails[], isVente: boolean): DocumentItem[] {
    return quotes.map(q => ({
      id: q.quote.id,
      number: q.quote.quoteNumber,
      date: q.quote.date,
      dueDate: q.quote.dueDate || q.quote.expirationDate || undefined,
      validationDate: q.quote.validationDate || null,
      partnerName: (isVente ? q.quote.customerName : q.quote.supplierName) || 'Inconnu',
      subtotal: q.quote.subtotal,
      tax: q.quote.tax,
      total: q.quote.total,
      paidAmount: 0,
      remainingAmount: q.quote.total,
      status: q.quote.status,
      isValidated: q.quote.isValidated,
      itemsCount: q.items.length
    }));
  }

  private transformOrdersToDocuments(orders: Order[], isVente: boolean): DocumentItem[] {
    return orders.map(order => ({
      id: order.id,
      number: order.orderNumber || `#${order.id}`,
      date: order.date || order.dateCreated,
      dueDate: order.dueDate || undefined,
      validationDate: order.validationDate || null,
      partnerName: (isVente ? order.customerName : order.supplierName) || 'Inconnu',
      subtotal: order.total || 0,
      tax: 0,
      total: order.total || 0,
      paidAmount: 0,
      remainingAmount: order.total || 0,
      status: order.status || 'draft',
      isValidated: order.isValidated || false,
      itemsCount: order.items?.length || 0
    }));
  }

  private mapInvoiceStatus(status: string, dueDate?: string | null): string {
    if (status === 'paid') return 'paid';
    if (status === 'partial') return 'partial';
    if (status === 'draft') return 'draft';
    if (status === 'unpaid' && dueDate && new Date(dueDate) < new Date()) {
      return 'overdue';
    }
    return 'unpaid';
  }

  async getAnalytics(
    type: DocumentType,
    direction: DocumentDirection,
    year?: number
  ): Promise<any> {
    const currentYear = year || new Date().getFullYear();

    if (type === 'facture') {
      return invoicesService.getAnalytics(direction, currentYear);
    } else if (type === 'devis') {
      return quotesService.getAnalytics(direction, currentYear);
    } else if (type === 'bon_livraison') {
      return ordersService.getAnalytics(direction, currentYear);
    }

    return null;
  }
}

export const documentsService = new DocumentsService();
