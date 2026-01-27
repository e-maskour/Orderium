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

export class DocumentsService {
  async getDocuments(
    type: DocumentType,
    direction: DocumentDirection
  ): Promise<DocumentItem[]> {
    if (type === 'facture') {
      const invoices = await invoicesService.getAll();
      const isVente = direction === 'vente';
      const filtered = invoices.filter(inv => 
        isVente ? inv.invoice.customerId : inv.invoice.supplierId
      );
      
      return this.transformInvoicesToDocuments(filtered, isVente);
    } else if (type === 'devis') {
      const quotes = await quotesService.getAll();
      return this.transformQuotesToDocuments(quotes);
    } else if (type === 'bon_livraison') {
      // Fetch only orders NOT created from portal (fromPortal = false)
      const orders = await ordersService.getAll(undefined, undefined, undefined, false);
      return this.transformOrdersToDocuments(orders);
    }
    
    return [];
  }

  async validateDocument(type: DocumentType, id: number): Promise<void> {
    if (type === 'facture') {
      await invoicesService.validate(id);
    } else if (type === 'devis') {
      await quotesService.validate(id);
    } else if (type === 'bon_livraison') {
      // Orders don't have a validate endpoint yet
      // TODO: Implement if needed
    }
  }

  async devalidateDocument(type: DocumentType, id: number): Promise<void> {
    if (type === 'facture') {
      await invoicesService.devalidate(id);
    } else if (type === 'devis') {
      await quotesService.devalidate(id);
    } else if (type === 'bon_livraison') {
      // Orders don't have a devalidate endpoint yet
      // TODO: Implement if needed
    }
  }

  async deleteDocument(type: DocumentType, id: number): Promise<void> {
    if (type === 'facture') {
      await invoicesService.delete(id);
    } else if (type === 'devis') {
      await quotesService.delete(id);
    } else if (type === 'bon_livraison') {
      // Orders don't have a delete endpoint yet
      // TODO: Implement if needed
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

  private transformQuotesToDocuments(quotes: QuoteWithDetails[]): DocumentItem[] {
    return quotes.map(q => ({
      id: q.quote.id,
      number: q.quote.quoteNumber,
      date: q.quote.date,
      dueDate: q.quote.expirationDate || undefined,
      validationDate: null,
      partnerName: q.quote.customerName || 'Inconnu',
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

  private transformOrdersToDocuments(orders: Order[]): DocumentItem[] {
    return orders.map(order => ({
      id: order.id,
      number: order.orderNumber || `#${order.id}`,
      date: order.date || order.dateCreated,
      dueDate: undefined,
      validationDate: null,
      partnerName: order.customerName || 'Inconnu',
      subtotal: order.total || 0,
      tax: 0,
      total: order.total || 0,
      paidAmount: 0,
      remainingAmount: order.total || 0,
      status: order.status || 'draft',
      isValidated: true, // Orders are always considered validated for now
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
}

export const documentsService = new DocumentsService();
