import { http } from '@/services/httpClient';
import { CreateOrderRequest, OrderResponse, OrdersListResponse } from './orders.interface';
import { Order } from './orders.model';

export class OrdersService {
  async create(data: CreateOrderRequest): Promise<OrderResponse> {
    const response = await http<OrderResponse>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.order) {
      response.order = Order.fromApiResponse(response.order);
    }

    return response;
  }

  async getById(id: number): Promise<Order> {
    const response = await http<{ success: boolean; order: any }>(`/api/orders/${id}`);
    // API returns { Order: {...}, Items: [...] }
    const orderData = response.order.Order || response.order;
    const items = response.order.Items || orderData.items || [];
    return Order.fromApiResponse({ ...orderData, items });
  }

  async getByOrderNumber(orderNumber: string, customerId: number): Promise<Order> {
    const response = await http<{ success: boolean; order: any }>(
      `/api/orders/number/${orderNumber}?customerId=${customerId}`
    );
    // API returns { Order: {...}, Items: [...] }
    const orderData = response.order.Order || response.order;
    const items = response.order.Items || orderData.items || [];
    return Order.fromApiResponse({ ...orderData, items });
  }

  async getCustomerOrders(customerId: number, limit = 50): Promise<OrdersListResponse> {
    const response = await http<OrdersListResponse>(
      `/api/orders/customer/${customerId}?limit=${limit}`
    );

    if (response.orders) {
      response.orders = response.orders.map((order: any) => Order.fromApiResponse(order));
    }

    return response;
  }
}

export const ordersService = new OrdersService();
