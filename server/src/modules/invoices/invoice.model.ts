export interface Invoice {
  Id: number;
  InvoiceNumber: string;
  CustomerId: number;
  AdminId?: number;
  Date: Date;
  DueDate: Date;
  Subtotal: number;
  TaxAmount: number;
  DiscountAmount: number;
  Total: number;
  PaidAmount: number;
  Status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  PaymentStatus: 'unpaid' | 'partial' | 'paid';
  Note?: string;
  Terms?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface InvoiceItem {
  Id: number;
  InvoiceId: number;
  ProductId: number;
  Description?: string;
  Quantity: number;
  UnitPrice: number;
  Discount: number;
  DiscountType: number; // 0 = fixed, 1 = percentage
  TaxRate: number;
  Total: number;
}

export interface CreateInvoiceDTO {
  CustomerId: number;
  AdminId?: number;
  Date?: Date;
  DueDate?: Date;
  Items: CreateInvoiceItemDTO[];
  Note?: string;
  Terms?: string;
  Status?: 'draft' | 'sent';
}

export interface CreateInvoiceItemDTO {
  ProductId: number;
  Description?: string;
  Quantity: number;
  UnitPrice: number;
  Discount?: number;
  DiscountType?: number;
  TaxRate?: number;
}

export interface UpdateInvoiceDTO {
  CustomerId?: number;
  Date?: Date;
  DueDate?: Date;
  Status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  Note?: string;
  Terms?: string;
  Items?: UpdateInvoiceItemDTO[];
}

export interface UpdateInvoiceItemDTO {
  Id?: number;
  ProductId: number;
  Description?: string;
  Quantity: number;
  UnitPrice: number;
  Discount?: number;
  DiscountType?: number;
  TaxRate?: number;
}

export interface InvoiceWithDetails {
  Invoice: Invoice;
  Items: InvoiceItem[];
  Customer: {
    Id: number;
    Name: string;
    Email?: string;
    Phone?: string;
    Address?: string;
    City?: string;
  };
}

export interface InvoiceFilters {
  status?: string;
  paymentStatus?: string;
  customerId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface RecordPaymentDTO {
  InvoiceId: number;
  Amount: number;
  PaymentDate: Date;
  PaymentMethod?: string;
  Note?: string;
}
