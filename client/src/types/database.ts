// Types matching API entities (camelCase)

export interface Partner {
  id: number;
  name: string;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
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

export interface Product {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  price: number;
  cost: number;
  stock?: number | null;
  isService: boolean;
  isEnabled: boolean;
  isPriceChangeAllowed?: boolean;
  imageUrl?: string | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface Order {
  id: number;
  number: string;
  adminId?: number | null;
  customerId: number | null;
  orderNumber: string | null;
  date: string;
  stockDate: string;
  total: number;
  isClockedOut: boolean;
  documentTypeId?: number | null;
  warehouseId?: number | null;
  referenceDocumentNumber?: string | null;
  internalNote?: string | null;
  note?: string | null;
  dueDate?: string | null;
  discount: number;
  discountType: number; // 0 = amount, 1 = percentage
  paidStatus: number;
  discountApplyRule: number;
  serviceType: number;
  dateCreated: string;
  dateUpdated: string;
  customer?: Partner;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  expectedQuantity: number;
  priceBeforeTax: number;
  discount: number;
  discountType: number;
  price: number;
  productCost: number;
  priceAfterDiscount: number;
  total: number;
  priceBeforeTaxAfterDiscount: number;
  totalAfterDocumentDiscount: number;
  discountApplyRule: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  date: string;
  dueDate: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  paidStatus: number;
  notes: string | null;
  dateCreated: string;
  dateUpdated: string;
  customer?: Partner;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  productId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  total: number;
}

// Legacy - keeping for backward compatibility
export interface DocumentCategory {
  id: number;
  name: string;
  languageKey: string | null;
}

export interface Document {
  id: number;
  number: string;
  customerId: number | null;
  orderNumber: string | null;
  documentCategoryId: number;
  date: string;
  total: number;
  discount: number;
  discountType: number;
  dueDate: string | null;
  note: string | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface DocumentItem {
  id: number;
  documentId: number;
  productId: number;
  quantity: number;
  price: number;
  discount: number;
  discountType: number;
  total: number;
}

// API Types
export interface CreateOrderRequest {
  customer: {
    name: string;
    email?: string;
    phoneNumber: string;
    address?: string;
    city?: string;
    postalCode?: string;
  };
  items: {
    productId: number;
    quantity: number;
    price: number;
  }[];
  discount?: number;
  discountType?: number;
  idempotencyKey: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  error?: string;
}

// Filter types
export type ProductCategory = 'all' | 'products' | 'services';

export interface ProductFilters {
  category: ProductCategory;
  search: string;
}
