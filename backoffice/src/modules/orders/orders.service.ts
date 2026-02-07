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

  async getAll(search?: string, startDate?: Date, endDate?: Date, fromPortal?: boolean, deliveryStatus?: string, fromClient?: boolean, orderNumber?: string, page: number = 1, perPage: number = 50): Promise<any> {
    // Parse search string for filters
    const filters: any = {};
    
    if (search) {
      const searchParts = search.split(' ');
      searchParts.forEach(part => {
        if (part.startsWith('customerId:')) {
          filters.customerId = parseInt(part.split(':')[1]);
        } else if (part.startsWith('deliveryPersonId:')) {
          filters.deliveryPersonId = parseInt(part.split(':')[1]);
        }
      });
    }
    
    // Build query params
    const params = new URLSearchParams();
    if (fromPortal !== undefined) params.append('fromPortal', fromPortal.toString());
    if (page) params.append('page', page.toString());
    if (perPage) params.append('perPage', perPage.toString());
    
    // Build POST body with filters
    const body: any = {};
    if (startDate) body.startDate = startDate.toISOString();
    if (endDate) body.endDate = endDate.toISOString();
    if (deliveryStatus) body.deliveryStatus = deliveryStatus;
    if (orderNumber) body.orderNumber = orderNumber;
    if (filters.customerId) body.customerId = filters.customerId;
    if (filters.deliveryPersonId) body.deliveryPersonId = filters.deliveryPersonId;
    if (fromClient !== undefined) body.fromClient = fromClient;
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/orders/filter${queryString ? `?${queryString}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data = await response.json();
    
    // API now returns { orders, count, totalCount, statusCounts }
    if (data.orders && Array.isArray(data.orders)) {
      return {
        ...data,
        orders: data.orders.map((o: any) => Order.fromApiResponse(o))
      };
    }
    
    // Fallback for old API response format
    const orders = Array.isArray(data) ? data : [];
    return {
      orders: orders.map((o: any) => Order.fromApiResponse(o)),
      count: orders.length,
      totalCount: orders.length,
      statusCounts: {}
    };
  }

  async getById(orderId: number): Promise<any> {
    const response = await fetch(`${API_URL}/orders/${orderId}`);
    if (!response.ok) throw new Error('Failed to fetch order details');
    const data = await response.json();
    // Return the raw API data since DocumentEditPage needs the full structure
    return data;
  }

  async update(orderId: number, orderData: any): Promise<any> {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update order');
    }
    return await response.json();
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

  async delete(orderId: number): Promise<void> {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      let errorMessage = 'Failed to delete order';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
  }

  async getOrderNumbers(search?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', '50');

    const response = await fetch(`${API_URL}/orders/search/order-numbers?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch order numbers');
    
    const data = await response.json();
    return data.data || [];
  }
}

export const ordersService = new OrdersService();
