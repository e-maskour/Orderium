export type OrderStatus = 'draft' | 'validated' | 'in_progress' | 'confirmed' | 'picked_up' | 'delivered' | 'cancelled';
export type DeliveryStatus = 'pending' | 'assigned' | 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled';

export interface IOrder {
  id: number;
  orderNumber: string;
  direction: 'ACHAT' | 'VENTE';
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
  validationDate?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  status: OrderStatus;
  isValidated: boolean;
  notes?: string | null;
  convertedToInvoiceId?: number | null;
  fromPortal?: boolean; // Indicates if order was created from delivery portal
  fromClient?: boolean; // Indicates if order was created from client app
  deliveryStatus?: DeliveryStatus | null; // Delivery lifecycle status
  deliveryPersonId?: number | null; // Business logic field, not in entity
  deliveryPersonName?: string | null; // Business logic field, not in entity
  deliveryPersonPhone?: string | null; // Business logic field, not in entity
  shareToken?: string | null;
  shareTokenExpiry?: string | null;
  paidAmount: number;
  remainingAmount: number;
  dateCreated: string;
  dateUpdated: string;
  items?: IOrderItem[]; // For compatibility with document services
}

export interface IOrderItem {
  id: number;
  orderId: number;
  productId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax: number;
  total: number;
}

export interface IOrderWithDetails {
  order: IOrder;
  items: IOrderItem[];
}

export interface OrderAssignment {
  orderId: number;
  deliveryPersonId: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface CreateOrderDTO {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  direction?: 'ACHAT' | 'VENTE';
  supplierId?: number;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  date: string;
  dueDate?: string;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  notes?: string;
  items: Omit<IOrderItem, 'id' | 'orderId'>[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateOrderDTO extends Partial<CreateOrderDTO> { }
