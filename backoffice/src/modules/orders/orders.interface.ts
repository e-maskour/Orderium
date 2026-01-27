export type OrderStatus = 'draft' | 'validated' | 'in_progress' | 'delivered' | 'cancelled';

export interface Order {
  id: number;
  orderNumber: string;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  date: string;
  dueDate?: string | null;
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
  deliveryPersonId?: number | null; // Business logic field, not in entity
  deliveryPersonName?: string | null; // Business logic field, not in entity
  dateCreated: string;
  dateUpdated: string;
  items?: OrderItem[]; // For compatibility with document services
}

export interface OrderItem {
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

export interface OrderWithDetails {
  order: Order;
  items: OrderItem[];
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
  date: string;
  dueDate?: string;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  notes?: string;
  items: Omit<OrderItem, 'id' | 'orderId'>[];
}

export interface UpdateOrderDTO extends Partial<CreateOrderDTO> {}
