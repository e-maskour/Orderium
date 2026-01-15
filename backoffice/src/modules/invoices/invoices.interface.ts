export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  adminId?: number | null;
  date: string;
  dueDate?: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  status: string;
  paymentStatus: string;
  note?: string | null;
  terms?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  productId?: number | null;
  productName: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: string;
  taxRate: number;
  total: number;
}

export interface InvoiceCustomer {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
}

export interface InvoiceWithDetails {
  invoice: Invoice;
  items: InvoiceItem[];
  customer?: InvoiceCustomer;
}

export interface InvoiceFilters {
  status?: string;
  paymentStatus?: string;
  customerId?: number;
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
  customerId: number;
  date: string;
  dueDate?: string;
  items: Array<{
    productId?: number;
    productName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: string;
    taxRate?: number;
  }>;
  note?: string;
  terms?: string;
}

export interface UpdateInvoiceDTO {
  date?: string;
  dueDate?: string;
  items?: Array<{
    productId?: number;
    productName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: string;
    taxRate?: number;
  }>;
  note?: string;
  terms?: string;
  status?: string;
  paymentStatus?: string;
}

export interface RecordPaymentDTO {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
}
