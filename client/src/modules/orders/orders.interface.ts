export interface CreateOrderItem {
  productId: number;
  description?: string;  // Added to match API requirement
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: number;
  tax?: number;  // Tax percentage or amount for this item
  total?: number;  // Calculated total for this item (unitPrice * quantity - discount)
}

export interface CreateOrderRequest {
  customerId?: number;
  customerPhone?: string;
  items: CreateOrderItem[];
  note?: string;
  internalNote?: string;
  subtotal?: number;  // Sum of all item totals before tax
  tax?: number;  // Total tax amount
  total?: number;  // Final total (subtotal + tax - discount)
  discount?: number;  // Order-level discount
  discountType?: number;  // 0=amount, 1=percentage
  fromPortal?: boolean;  // Indicates if order is from portal
  fromClient?: boolean;  // Indicates if order is from client app
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
  deliveryStatus?: string;
  note?: string;
  internalNote?: string;
  date?: string;  // API returns 'date' field
  dateCreated: string;
  dateUpdated: string;
  isValidated?: boolean;
  fromPortal?: boolean;  // Default to true
  fromClient?: boolean;  // Indicates if order is from client app
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName?: string;
  description?: string;  // Added to match API
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  taxAmount?: number;
  tax?: number;  // API may return 'tax' field
  total: number;
}

export interface OrderResponse {
  data: Order;
  metadata?: Record<string, unknown> | null;
}

export interface OrdersListResponse {
  data: Order[];
  metadata?: {
    limit: number;
    offset: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
}
