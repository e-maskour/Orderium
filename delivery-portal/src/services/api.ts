import { Order } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const API_URL = `${BASE}/api/delivery`;

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

interface LoginResponse {
  data: {
    deliveryPerson: {
      id: number;
      name: string;
      phoneNumber: string;
      email?: string;
    };
    token: string;
  };
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
    return data.data.deliveryPerson;
  },

  async getMyOrders(deliveryPersonId: number, filters: OrderFilters = {}): Promise<OrdersResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

    const queryString = params.toString();
    const url = `${API_URL}/person/${deliveryPersonId}/orders${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        orderNumber: filters.orderNumber,
        customerName: filters.customerName,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    });
    if (!response.ok) throw new Error('Failed to fetch orders');
    const json = await response.json();
    // API wraps response as { data: Order[], metadata: { total, limit, offset, ... } }
    const orders: Order[] = json.data ?? [];
    const total: number = json.metadata?.total ?? orders.length;
    const totalPages = Math.ceil(total / (filters.pageSize ?? 50));
    return {
      success: true,
      orders,
      total,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 50,
      totalPages,
    };
  },

  async updateOrderStatus(orderId: number, status: 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled', deliveryPersonId: number): Promise<void> {
    const response = await fetch(`${API_URL}/person/${deliveryPersonId}/order/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status: status }),
    });
    if (!response.ok) throw new Error('Failed to update order status');
  },
};
