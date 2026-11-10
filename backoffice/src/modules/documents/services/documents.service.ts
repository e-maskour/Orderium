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
  /** Server-side sort; ignored when the document type's API doesn't support the field. */
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface DocumentsResult {
  documents: DocumentItem[];
  count: number;
  totalCount: number;
}

/** `YYYY-MM-DD` (a local calendar day) → local midnight. */
function localDayStart(day?: string): Date | undefined {
  return day ? new Date(`${day.slice(0, 10)}T00:00:00`) : undefined;
}

/** `YYYY-MM-DD` (a local calendar day) → last millisecond of that local day. */
function localDayEnd(day?: string): Date | undefined {
  return day ? new Date(`${day.slice(0, 10)}T23:59:59.999`) : undefined;
}

/** Today's local calendar day as `YYYY-MM-DD`. */
function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Sort fields each document API whitelists (see the API's *_SORT_FIELDS).
 * A field outside the list is dropped so the request never fails validation.
 */
const SORTABLE_FIELDS: Record<DocumentType, readonly string[]> = {
  facture: [
    'number',
    'partnerName',
    'date',
    'dueDate',
    'validationDate',
    'subtotal',
    'tax',
    'total',
    'paidAmount',
    'remainingAmount',
    'status',
  ],
  devis: [
    'number',
    'partnerName',
    'date',
    'dueDate',
    'validationDate',
    'subtotal',
    'tax',
    'total',
    'status',
  ],
  bon_livraison: [
    'number',
    'partnerName',
    'date',
    'dueDate',
    'validationDate',
    'subtotal',
    'tax',
    'total',
    'paidAmount',
    'remainingAmount',
    'status',
  ],
};

function resolveSort(
  type: DocumentType,
  filters?: DocumentFilters,
): { sortField?: string; sortOrder?: 'ASC' | 'DESC' } {
  const field = filters?.sortField;
  if (!field || !SORTABLE_FIELDS[type]?.includes(field)) return {};
  return { sortField: field, sortOrder: filters?.sortOrder ?? 'ASC' };
}

/** Invoice / quote filters (both APIs share the same body shape). */
function toInvoiceLikeFilters(
  type: DocumentType,
  direction: DocumentDirection,
  filters?: DocumentFilters,
) {
  const isVente = direction === 'vente';
  return {
    search: filters?.search,
    status: (filters?.status !== 'all' ? filters?.status : undefined) as any,
    customerId: isVente && filters?.partnerId ? filters.partnerId : undefined,
    supplierId: !isVente && filters?.partnerId ? filters.partnerId : undefined,
    direction: isVente ? ('VENTE' as const) : ('ACHAT' as const),
    dateFrom: filters?.dateFrom,
    dateTo: filters?.dateTo,
    page: filters?.page,
    pageSize: filters?.pageSize,
    ...resolveSort(type, filters),
  };
}

/** Delivery-note filters for POST /orders/filter (BACKOFFICE orders only). */
function toOrderFilters(direction: DocumentDirection, filters?: DocumentFilters) {
  return {
    search: filters?.search,
    startDate: localDayStart(filters?.dateFrom),
    endDate: localDayEnd(filters?.dateTo),
    originType: 'BACKOFFICE',
    status: filters?.status && filters.status !== 'all' ? [filters.status] : undefined,
    direction: direction === 'vente' ? ('VENTE' as const) : ('ACHAT' as const),
  };
}

function toOrderSort(filters?: DocumentFilters) {
  const { sortField, sortOrder } = resolveSort('bon_livraison', filters);
  return sortField ? { field: sortField, order: sortOrder } : undefined;
}

export class DocumentsService {
  async getDocuments(
    type: DocumentType,
    direction: DocumentDirection,
    filters?: DocumentFilters,
  ): Promise<DocumentsResult> {
    const isVente = direction === 'vente';
    // Direction (and every other filter) is applied by the API — no client-side
    // filtering, so the rows always match the server-side total/pagination.
    if (type === 'facture') {
      const result = await invoicesService.getAll(toInvoiceLikeFilters(type, direction, filters));
      return {
        documents: this.transformInvoicesToDocuments(result.invoices || [], isVente),
        count: result.count,
        totalCount: result.totalCount,
      };
    } else if (type === 'devis') {
      const result = await quotesService.getAll(toInvoiceLikeFilters(type, direction, filters));
      return {
        documents: this.transformQuotesToDocuments(result.quotes || [], isVente),
        count: result.count,
        totalCount: result.totalCount,
      };
    } else if (type === 'bon_livraison') {
      const f = toOrderFilters(direction, filters);
      const result = await ordersService.getAll(
        f.search,
        f.startDate,
        f.endDate,
        f.originType,
        undefined,
        undefined,
        filters?.page,
        filters?.pageSize,
        f.direction,
        f.status,
        toOrderSort(filters),
      );
      return {
        documents: this.transformOrdersToDocuments(result.orders || [], isVente),
        count: result.count,
        totalCount: result.totalCount,
      };
    }

    return { documents: [], count: 0, totalCount: 0 };
  }

  async getAggregates(
    type: DocumentType,
    direction: DocumentDirection,
    filters?: DocumentFilters,
  ): Promise<{
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
    totalSubtotal: number;
  }> {
    const empty = { totalAmount: 0, totalPaid: 0, totalRemaining: 0, totalSubtotal: 0 };

    if (type === 'facture') {
      return invoicesService.getAggregates(toInvoiceLikeFilters(type, direction, filters));
    } else if (type === 'devis') {
      return quotesService.getAggregates(toInvoiceLikeFilters(type, direction, filters));
    } else if (type === 'bon_livraison') {
      const f = toOrderFilters(direction, filters);
      return ordersService.getAggregates(
        f.search,
        f.startDate,
        f.endDate,
        f.originType,
        undefined,
        undefined,
        f.direction,
        f.status,
      );
    }

    return empty;
  }

  /**
   * XLSX export of every document matching the list's filters and sort (all
   * pages) — built from the same filter mapping as `getDocuments`.
   */
  async exportDocuments(
    type: DocumentType,
    direction: DocumentDirection,
    filters?: DocumentFilters,
  ): Promise<Blob> {
    const exportFilters = { ...filters, page: undefined, pageSize: undefined };
    if (type === 'facture') {
      return invoicesService.exportToXlsx(toInvoiceLikeFilters(type, direction, exportFilters));
    }
    if (type === 'devis') {
      return quotesService.exportToXlsx(toInvoiceLikeFilters(type, direction, exportFilters));
    }
    if (type === 'bon_livraison') {
      return ordersService.exportToXlsx(
        toOrderFilters(direction, exportFilters),
        toOrderSort(exportFilters),
      );
    }
    throw new Error(`Unsupported document type: ${type}`);
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
    isVente: boolean,
  ): DocumentItem[] {
    return invoices.map((inv) => ({
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
      itemsCount: inv.items.length,
    }));
  }

  private transformQuotesToDocuments(quotes: QuoteWithDetails[], isVente: boolean): DocumentItem[] {
    return quotes.map((q) => ({
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
      itemsCount: q.items.length,
    }));
  }

  private transformOrdersToDocuments(orders: Order[], isVente: boolean): DocumentItem[] {
    return orders.map((order) => ({
      id: order.id,
      // These are always BACKOFFICE orders — use documentNumber (BL-xxx / PROV-xxx).
      // orderNumber is null for BACKOFFICE; do not fall back to it.
      number: order.documentNumber || `#${order.id}`,
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
      itemsCount: order.items?.length || 0,
    }));
  }

  private mapInvoiceStatus(status: string, dueDate?: string | null): string {
    if (status === 'paid') return 'paid';
    if (status === 'partial') return 'partial';
    if (status === 'draft') return 'draft';
    // Overdue = unpaid and due before today (mirrors the API's `overdue` filter)
    if (status === 'unpaid' && dueDate && dueDate.slice(0, 10) < todayKey()) {
      return 'overdue';
    }
    return 'unpaid';
  }

  async getAnalytics(
    type: DocumentType,
    direction: DocumentDirection,
    year?: number,
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
