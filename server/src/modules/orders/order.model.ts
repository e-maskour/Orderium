export interface Document {
  Id: number;
  Number: string;
  UserId: number;
  CustomerId?: number;
  CashRegisterId?: number;
  OrderNumber?: string;
  Date: Date;
  StockDate: Date;
  Total: number;
  IsClockedOut: boolean;
  DocumentTypeId: number;
  WarehouseId: number;
  ReferenceDocumentNumber?: string;
  InternalNote?: string;
  Note?: string;
  DueDate?: Date;
  Discount: number;
  DiscountType: number;
  PaidStatus: number;
  DateCreated: Date;
  DateUpdated: Date;
  DiscountApplyRule: number;
  ServiceType: number;
}

export interface DocumentItem {
  Id: number;
  DocumentId: number;
  ProductId: number;
  Quantity: number;
  ExpectedQuantity: number;
  PriceBeforeTax: number;
  Discount: number;
  DiscountType: number;
  Price: number;
  ProductCost: number;
  PriceAfterDiscount: number;
  Total: number;
  PriceBeforeTaxAfterDiscount: number;
  TotalAfterDocumentDiscount: number;
  DiscountApplyRule: number;
}

export interface CreateOrderDTO {
  CustomerId?: number;
  CustomerPhone?: string; // Used to lookup customer if CustomerId not provided
  UserId?: number; // Default to 1 if not provided
  CashRegisterId?: number; // Default to 1 if not provided
  WarehouseId?: number; // Default to 1 if not provided
  DocumentTypeId?: number; // Default to 2 (sales) if not provided
  Items: CreateOrderItemDTO[];
  Note?: string;
  InternalNote?: string;
}

export interface CreateOrderItemDTO {
  ProductId: number;
  Quantity: number;
  Price: number;
  Discount?: number;
  DiscountType?: number;
}

export interface OrderWithItems {
  Document: Document;
  Items: DocumentItem[];
}
