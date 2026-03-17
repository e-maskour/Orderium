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
    const response = await http<{ success: boolean; order: Record<string, unknown> }>(`/api/orders/${id}`);
    // API returns { Order: {...}, Items: [...] }
    const orderData = (response.order.Order || response.order) as Record<string, unknown>;
    const items = (response.order.Items || orderData.items || []) as unknown[];
    return Order.fromApiResponse({ ...orderData, items });
  }

  async getByOrderNumber(orderNumber: string, customerId: number): Promise<Order> {
    const response = await http<{ success: boolean; order: Record<string, unknown> }>(
      `/api/orders/number/${orderNumber}?customerId=${customerId}`
    );
    // API returns { Order: {...}, Items: [...] }
    const orderData = (response.order.Order || response.order) as Record<string, unknown>;
    const items = (response.order.Items || orderData.items || []) as unknown[];
    return Order.fromApiResponse({ ...orderData, items });
  }

  async getCustomerOrders(
    customerId: number,
    page: number = 1,
    pageSize: number = 10,
    orderNumber?: string,
    deliveryStatus?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<OrdersListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    if (orderNumber) params.append('orderNumber', orderNumber);
    if (deliveryStatus) params.append('deliveryStatus', deliveryStatus);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const response = await http<OrdersListResponse>(
      `/api/orders/customer/${customerId}?${params.toString()}`
    );

    if (response.orders) {
      response.orders = response.orders.map((order) => Order.fromApiResponse(order as Record<string, unknown>));
    }

    return response;
  }
}

export const ordersService = new OrdersService();
