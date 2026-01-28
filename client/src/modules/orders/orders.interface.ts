export interface CreateOrderItem {
  productId: number;
  description?: string;  // Added to match API requirement
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
  orderNumber: string;  // API returns 'orderNumber' not 'number'
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: OrderItem[];
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  status: string;
  note?: string;
  internalNote?: string;
  date?: string;  // API returns 'date' field
  dateCreated: string;
  dateUpdated: string;
  isValidated?: boolean;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName?: string;
  description?: string;  // Added to match API
  quantity: number;
  unitPrice: number;
  price?: number;  // API may return 'price' field
  discount: number;
  discountType: number;
  taxAmount?: number;
  tax?: number;  // API may return 'tax' field
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
