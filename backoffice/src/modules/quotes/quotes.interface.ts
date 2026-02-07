export type QuoteStatus = 'draft' | 'open' | 'signed' | 'closed' | 'delivered' | 'invoiced';

export interface Quote {
  id: number;
  quoteNumber: string;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
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

export interface QuoteItem {
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

export interface QuoteWithDetails {
  quote: Quote;
  items: QuoteItem[];
}

export interface QuoteFilters {
  status?: QuoteStatus;
  customerId?: number;
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
  date: string;
  expirationDate?: string;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  notes?: string;
  items: Omit<QuoteItem, 'id' | 'quoteId'>[];
}

export interface UpdateQuoteDTO extends Partial<CreateQuoteDTO> {}
