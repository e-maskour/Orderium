export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  supplierId?: number | null;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierAddress?: string | null;
  date: string;
  dueDate?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  status: 'draft' | 'unpaid' | 'partial' | 'paid';
  isValidated: boolean;
  notes?: string | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  productId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax: number;
  total: number;
}

export interface InvoiceWithDetails {
  invoice: Invoice;
  items: InvoiceItem[];
}

export interface InvoiceFilters {
  status?: 'draft' | 'unpaid' | 'partial' | 'paid';
  customerId?: number;
  supplierId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface InvoiceStatistics {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export interface CreateInvoiceDTO {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  supplierId?: number;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  date: string;
  dueDate?: string;
  items: Array<{
    productId?: number;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: number;
    tax?: number;
  }>;
  tax?: number;
  discount?: number;
  discountType?: number;
  notes?: string;
}

export interface UpdateInvoiceDTO {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  supplierId?: number;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  date?: string;
  dueDate?: string;
  items?: Array<{
    productId?: number;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: number;
    tax?: number;
  }>;
  tax?: number;
  discount?: number;
  discountType?: number;
  notes?: string;
}

export interface RecordPaymentDTO {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
}
