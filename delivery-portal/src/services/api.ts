import { Order } from '../types';

const API_URL = '/api/delivery';

interface LoginResponse {
  success: boolean;
  deliveryPerson: {
    Id: number;
    Name: string;
    PhoneNumber: string;
    Email?: string;
  };
  token: string;
}

interface OrdersResponse {
  success: boolean;
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface OrderFilters {
  page?: number;
  pageSize?: number;
  orderNumber?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
}

export const deliveryService = {
  async login(phoneNumber: string, password: string) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        PhoneNumber: phoneNumber,
        Password: password,
      }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data: LoginResponse = await response.json();
    return data.deliveryPerson;
  },

  async getMyOrders(deliveryPersonId: number, filters: OrderFilters = {}): Promise<OrdersResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
    
    const queryString = params.toString();
    const url = `${API_URL}/person/${deliveryPersonId}/orders${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: filters.orderNumber,
        customerName: filters.customerName,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    });
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data: OrdersResponse = await response.json();
    return data;
  },

  async updateOrderStatus(orderId: number, status: 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled', deliveryPersonId: number): Promise<void> {
    const response = await fetch(`${API_URL}/person/${deliveryPersonId}/order/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status }),
    });
    if (!response.ok) throw new Error('Failed to update order status');
  },
};
