export interface CreateOrderItem {
  productId: number;
  quantity: number;
  price: number;
  discount?: number;
  discountType?: number;
}

export interface CreateOrderRequest {
  customerId?: number;
  customerPhone?: string;
  items: CreateOrderItem[];
  note?: string;
  internalNote?: string;
}

export interface Order {
  id: number;
  number: string;
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: string;
  note?: string;
  internalNote?: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  taxAmount: number;
  total: number;
}

export interface OrderResponse {
  success: boolean;
  order: Order;
  documentNumber: string;
}

export interface OrdersListResponse {
  success: boolean;
  orders: Order[];
  count: number;
}
