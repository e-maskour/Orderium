export interface DeliveryPerson {
  Id: number;
  Name: string;
  PhoneNumber: string;
  Email?: string;
  IsActive: boolean;
  DateCreated: string;
  DateUpdated?: string;
}

export interface Customer {
  Id: number;
  Code?: string;
  Name: string;
  TaxNumber?: string;
  Address?: string;
  PostalCode?: string;
  City?: string;
  CountryId?: number;
  Email?: string;
  PhoneNumber?: string;
  IsEnabled: boolean;
  IsCustomer: boolean;
  IsSupplier: boolean;
  DueDatePeriod: number;
  DateCreated: string;
  DateUpdated: string;
  StreetName?: string;
  AdditionalStreetName?: string;
  BuildingNumber?: string;
  PlotIdentification?: string;
  CitySubdivisionName?: string;
  CountrySubentity?: string;
  IsTaxExempt: boolean;
  PriceListId?: number;
  Latitude?: number;
  Longitude?: number;
  GoogleMapsUrl?: string;
  WazeUrl?: string;
  totalOrders?: number;
}

export interface Order {
  OrderId: number;
  OrderNumber: string;
  CustomerName: string;
  CustomerPhone: string;
  CustomerAddress?: string;
  GoogleMapsUrl?: string;
  WazeUrl?: string;
  TotalAmount: number;
  Status: 'assigned' | 'confirmed' | 'picked_up' | 'in_delivery' | 'delivered';
  DeliveryPersonId?: number;
  ConfirmedAt?: string;
  PickedUpAt?: string;
  DeliveredAt?: string;
  CreatedAt: string;
  AssignedAt?: string;
}

export interface OrderDelivery {
  Id: number;
  DocumentId: number;
  CustomerId: number;
  DeliveryId: number;
  Status: 'assigned' | 'confirmed' | 'picked_up' | 'in_delivery' | 'delivered';
  DateCreated: string;
}

// Invoice types
export interface Invoice {
  Id: number;
  InvoiceNumber: string;
  CustomerId: number;
  UserId: number;
  Date: string;
  DueDate: string;
  Subtotal: number;
  TaxAmount: number;
  DiscountAmount: number;
  Total: number;
  PaidAmount: number;
  Status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  PaymentStatus: 'unpaid' | 'partial' | 'paid';
  Note?: string;
  Terms?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface InvoiceItem {
  Id: number;
  InvoiceId: number;
  ProductId: number;
  ProductName?: string;
  Description?: string;
  Quantity: number;
  UnitPrice: number;
  Discount: number;
  DiscountType: 0 | 1; // 0 = fixed, 1 = percentage
  TaxRate: number;
  Total: number;
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
  User: {
    Id: number;
    Name: string;
    Email?: string;
  };
}

export interface CreateInvoiceDTO {
  CustomerId: number;
  UserId?: number;
  Date?: Date;
  DueDate?: Date;
  Items: {
    ProductId: number;
    Description?: string;
    Quantity: number;
    UnitPrice: number;
    Discount?: number;
    DiscountType?: 0 | 1;
    TaxRate?: number;
  }[];
  Note?: string;
  Terms?: string;
  Status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

export interface UpdateInvoiceDTO {
  CustomerId?: number;
  Date?: Date;
  DueDate?: Date;
  Items?: {
    ProductId: number;
    Description?: string;
    Quantity: number;
    UnitPrice: number;
    Discount?: number;
    DiscountType?: 0 | 1;
    TaxRate?: number;
  }[];
  Note?: string;
  Terms?: string;
  Status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

export interface RecordPaymentDTO {
  InvoiceId: number;
  Amount: number;
  PaymentMethod?: string;
  Reference?: string;
  Note?: string;
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
