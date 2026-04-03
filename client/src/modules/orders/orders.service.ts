import { http } from '@/services/httpClient';
import { CreateOrderRequest, OrderResponse, OrdersListResponse } from './orders.interface';
import { Order } from './orders.model';
import { API_ROUTES } from '@/common/api-routes';

export class OrdersService {
  async create(data: CreateOrderRequest): Promise<OrderResponse> {
    const response = await http<OrderResponse>(API_ROUTES.ORDERS.CREATE, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.data) {
      response.data = Order.fromApiResponse(response.data as unknown as Record<string, unknown>);
    }

    return response;
  }

  async getById(id: number): Promise<Order> {
    const response = await http<OrderResponse>(API_ROUTES.ORDERS.DETAIL(id));
    return Order.fromApiResponse(response.data as unknown as Record<string, unknown>);
  }

  async getByOrderNumber(orderNumber: string, customerId: number): Promise<Order> {
    const response = await http<OrderResponse>(
      API_ROUTES.ORDERS.BY_NUMBER(orderNumber, customerId),
    );
    return Order.fromApiResponse(response.data as unknown as Record<string, unknown>);
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
      `${API_ROUTES.ORDERS.CUSTOMER(customerId)}?${params.toString()}`,
    );

    if (response.data) {
      response.data = response.data.map((order) =>
        Order.fromApiResponse(order as unknown as Record<string, unknown>),
      );
    }

    return response;
  }
}

export const ordersService = new OrdersService();
