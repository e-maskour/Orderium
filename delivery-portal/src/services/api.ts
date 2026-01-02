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

  async getMyOrders(deliveryPersonId: number): Promise<Order[]> {
    const response = await fetch(`${API_URL}/orders?deliveryPersonId=${deliveryPersonId}`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data: OrdersResponse = await response.json();
    return data.orders;
  },

  async updateOrderStatus(orderId: number, status: 'confirmed' | 'picked_up' | 'in_delivery' | 'delivered', deliveryPersonId: number): Promise<void> {
    const response = await fetch(`${API_URL}/orders/${orderId}/status?deliveryPersonId=${deliveryPersonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Status: status }),
    });
    if (!response.ok) throw new Error('Failed to update order status');
  },
};
