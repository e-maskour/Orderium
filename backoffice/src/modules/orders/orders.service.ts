import { Order } from './orders.model';

const API_URL = '/api';

export class OrdersService {
  async create(orderData: any): Promise<any> {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create order');
    }
    return await response.json();
  }

  async getAll(search?: string, startDate?: Date, endDate?: Date, fromPortal?: boolean): Promise<Order[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    if (fromPortal !== undefined) params.append('fromPortal', fromPortal.toString());
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/orders${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data = await response.json();
    const orders = data.orders || data;
    return Array.isArray(orders) ? orders.map((o: any) => Order.fromApiResponse(o)) : [];
  }

  async getById(orderId: number): Promise<any> {
    const response = await fetch(`${API_URL}/orders/${orderId}`);
    if (!response.ok) throw new Error('Failed to fetch order details');
    const data = await response.json();
    // Return the raw API data since DocumentEditPage needs the full structure
    return data;
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

  async validate(orderId: number): Promise<any> {
    const response = await fetch(`${API_URL}/orders/${orderId}/validate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate order');
    }
    return await response.json();
  }

  async devalidate(orderId: number): Promise<any> {
    const response = await fetch(`${API_URL}/orders/${orderId}/devalidate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to devalidate order');
    }
    return await response.json();
  }

  async deliver(orderId: number): Promise<any> {
    const response = await fetch(`${API_URL}/orders/${orderId}/deliver`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to mark order as delivered');
    }
    return await response.json();
  }

  async cancel(orderId: number): Promise<any> {
    const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel order');
    }
    return await response.json();
  }

  async markAsInvoiced(orderId: number, invoiceId: number): Promise<any> {
    const response = await fetch(`${API_URL}/orders/${orderId}/mark-invoiced`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to mark order as invoiced');
    }
    return await response.json();
  }
}

export const ordersService = new OrdersService();
