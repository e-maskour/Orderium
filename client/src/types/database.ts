// Types based on Aronium SQL Server schema

export interface Customer {
  Id: number;
  Code: string | null;
  Name: string;
  TaxNumber: string | null;
  Email: string | null;
  PhoneNumber: string | null;
  Address: string | null;
  City: string | null;
  PostalCode: string | null;
  IsEnabled: boolean;
  DateCreated: string;
  DateUpdated: string;
}

export interface Product {
  Id: number;
  Name: string;
  Code: string | null;
  Barcode?: string | null;
  Description: string | null;
  Price: number;
  Cost: number;
  Stock?: number;
  IsService: boolean;
  IsEnabled: boolean;
  DateCreated: string;
  DateUpdated: string;
  // Virtual field for UI
  imageUrl?: string;
}

export interface Order {
  Id: number;
  Number: string;
  CustomerId: number | null;
  Discount: number;
  DiscountType: number; // 0 = amount, 1 = percentage
  Total: number;
  DateCreated: string;
}

export interface OrderItem {
  Id: number;
  OrderId: number;
  ProductId: number;
  Quantity: number;
  Price: number;
  Discount: number;
  DiscountType: number;
  Total: number;
  DateCreated: string;
}

export interface DocumentCategory {
  Id: number;
  Name: string;
  LanguageKey: string | null;
}

export interface Document {
  Id: number;
  Number: string;
  CustomerId: number | null;
  OrderNumber: string | null;
  DocumentCategoryId: number;
  Date: string;
  Total: number;
  Discount: number;
  DiscountType: number;
  DueDate: string | null;
  Note: string | null;
  DateCreated: string;
  DateUpdated: string;
}

export interface DocumentItem {
  Id: number;
  DocumentId: number;
  ProductId: number;
  Quantity: number;
  Price: number;
  Discount: number;
  DiscountType: number;
  Total: number;
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
