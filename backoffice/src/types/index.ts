export interface DeliveryPerson {
  id: number;
  name: string;
  phoneNumber: string;
  email?: string;
  isActive: boolean;
  dateCreated: string;
  dateUpdated?: string;
}

export interface Customer {
  id: number;
  code?: string;
  name: string;
  taxNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  countryId?: number;
  email?: string;
  phoneNumber?: string;
  isEnabled: boolean;
  isCustomer: boolean;
  isSupplier: boolean;
  dueDatePeriod: number;
  dateCreated: string;
  dateUpdated: string;
  streetName?: string;
  additionalStreetName?: string;
  buildingNumber?: string;
  plotIdentification?: string;
  citySubdivisionName?: string;
  countrySubentity?: string;
  isTaxExempt: boolean;
  priceListId?: number;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  wazeUrl?: string;
  totalOrders?: number;
}

export interface Order {
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  googleMapsUrl?: string;
  wazeUrl?: string;
  totalAmount: number;
  status: 'assigned' | 'confirmed' | 'picked_up' | 'in_delivery' | 'delivered';
  deliveryPersonId?: number;
  confirmedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
  assignedAt?: string;
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
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
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
