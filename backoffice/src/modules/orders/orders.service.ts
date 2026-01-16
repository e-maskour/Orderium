import { Order } from './orders.model';

const API_URL = '/api';

export class OrdersService {
  async getAll(search?: string, startDate?: Date, endDate?: Date): Promise<Order[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/orders${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data = await response.json();
    const orders = data.orders || data;
    return Array.isArray(orders) ? orders.map((o: any) => Order.fromApiResponse(o)) : [];
  }

  async getById(orderId: number): Promise<Order> {
    const response = await fetch(`${API_URL}/orders/${orderId}`);
    if (!response.ok) throw new Error('Failed to fetch order details');
    const data = await response.json();
    return Order.fromApiResponse(data.order);
  }

  async assignToDelivery(orderId: number, deliveryPersonId: number): Promise<void> {
    const response = await fetch(`${API_URL}/delivery/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ OrderId: orderId, DeliveryPersonId: deliveryPersonId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign order');
    }
  }

  async unassignOrder(orderId: number): Promise<void> {
    const response = await fetch(`${API_URL}/delivery/unassign/${orderId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to unassign order');
  }
}

export const ordersService = new OrdersService();
