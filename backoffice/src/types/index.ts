export interface DeliveryPerson {
  id: number;
  name: string;
  phoneNumber: string;
  email?: string;
  isActive: boolean;
  dateCreated: string;
  dateUpdated?: string;
}

export interface Partner {
  id: number;
  name: string;
  phoneNumber: string;
  email?: string | null;
  address?: string | null;
  ice?: string | null;
  if?: string | null;
  cnss?: string | null;
  rc?: string | null;
  patente?: string | null;
  tvaNumber?: string | null;
  deliveryAddress?: string | null;
  isCompany: boolean;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  wazeUrl?: string | null;
  isEnabled: boolean;
  isCustomer: boolean;
  isSupplier: boolean;
  dateCreated: string;
  dateUpdated: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  date: Date;
  total: number;
  status: string;
  note?: string;
  createdAt?: string;
  customer: {
    id: number;
    name: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    id: number;
    productId: number;
    description: string;
    quantity: number;
    price: number;
    totalPrice: number;
    totalPriceWithoutTax: number;
  }>;
}

export interface OrderDelivery {
  id: number;
  documentId: number;
  customerId: number;
  deliveryId: number;
  status: 'assigned' | 'confirmed' | 'picked_up' | 'in_delivery' | 'delivered';
  dateCreated: string;
}

// Invoice types
export enum InvoiceStatus {
  DRAFT = 'draft',
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid'
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  adminId?: number;
  date: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  note?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  productId: number;
  productName?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 0 | 1; // 0 = fixed, 1 = percentage
  taxRate: number;
  total: number;
}

export interface InvoiceWithDetails {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
  };
}

export interface CreateInvoiceDTO {
  customerId: number;
  adminId?: number;
  date?: Date;
  dueDate?: Date;
  items: {
    productId: number;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: 0 | 1;
    taxRate?: number;
  }[];
  note?: string;
  terms?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

export interface UpdateInvoiceDTO {
  customerId?: number;
  date?: Date;
  dueDate?: Date;
  items?: {
    productId: number;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: 0 | 1;
    taxRate?: number;
  }[];
  note?: string;
  terms?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

export interface RecordPaymentDTO {
  invoiceId: number;
  amount: number;
  paymentMethod?: string;
  reference?: string;
  note?: string;
}

export interface InvoiceFilters {
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
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
  overdueAmount: number;
}
