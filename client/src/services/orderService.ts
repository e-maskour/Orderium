import { http } from './httpClient';

export interface CreateOrderItem {
  ProductId: number;
  Quantity: number;
  Price: number;
  Discount?: number;
  DiscountType?: number;
}

export interface CreateOrderRequest {
  CustomerId?: number;
  CustomerPhone?: string;
  Items: CreateOrderItem[];
  Note?: string;
  InternalNote?: string;
}

export interface OrderResponse {
  success: boolean;
  order: any;
  documentNumber: string;
}

export const orderService = {
  /**
   * Create a new order
   */
  create: (data: CreateOrderRequest) => {
    return http<OrderResponse>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get order by ID
   */
  getById: (id: number) => {
    return http<{ success: boolean; order: any }>(`/api/orders/${id}`);
  },

  /**
   * Get order by order number
   */
  getByOrderNumber: (orderNumber: string, customerId: number) => {
    return http<{ success: boolean; order: any }>(`/api/orders/number/${orderNumber}?customerId=${customerId}`);
  },

  /**
   * Get customer orders
   */
  getCustomerOrders: (customerId: number, limit = 50) => {
    return http<{ success: boolean; orders: any[]; count: number }>(
      `/api/orders/customer/${customerId}?limit=${limit}`
    );
  },
};
