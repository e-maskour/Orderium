export type QuoteStatus = 'draft' | 'open' | 'signed' | 'closed' | 'delivered' | 'invoiced';

export interface IQuote {
  id: number;
  quoteNumber: string;
  direction: 'ACHAT' | 'VENTE';
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  supplierId?: number | null;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierAddress?: string | null;
  date: string;
  expirationDate?: string | null;
  dueDate?: string | null;
  validationDate?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  status: QuoteStatus;
  isValidated: boolean;
  notes?: string | null;
  clientNotes?: string | null;
  signedBy?: string | null;
  signedDate?: string | null;
  shareToken?: string | null;
  shareTokenExpiry?: string | null;
  convertedToInvoiceId?: number | null;
  convertedToOrderId?: number | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface IQuoteItem {
  id: number;
  quoteId: number;
  productId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax: number;
  total: number;
}

export interface IQuoteWithDetails {
  quote: IQuote;
  items: IQuoteItem[];
}

export interface QuoteFilters {
  status?: QuoteStatus;
  customerId?: number;
  supplierId?: number;
  direction?: 'ACHAT' | 'VENTE';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateQuoteDTO {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  direction?: 'ACHAT' | 'VENTE';
  supplierId?: number;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  date: string;
  expirationDate?: string;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  notes?: string;
  items: Omit<IQuoteItem, 'id' | 'quoteId'>[];
}

export interface UpdateQuoteDTO extends Partial<CreateQuoteDTO> {}
