import { DeliveryPerson } from '../types';

const API_URL = '/api';

export const deliveryPersonService = {
  async getAll(): Promise<DeliveryPerson[]> {
    const response = await fetch(`${API_URL}/delivery`);
    if (!response.ok) throw new Error('Failed to fetch delivery persons');
    const data = await response.json();
    return data.deliveryPersons || [];
  },

  async getById(id: number): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery/${id}`);
    if (!response.ok) throw new Error('Failed to fetch delivery person');
    const data = await response.json();
    return data.deliveryPerson;
  },

  async create(data: Omit<DeliveryPerson, 'Id' | 'DateCreated' | 'DateUpdated'> & { Password: string }): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create delivery person');
    }
    const result = await response.json();
    return result.deliveryPerson;
  },

  async update(id: number, data: Partial<DeliveryPerson>): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update delivery person');
    const result = await response.json();
    return result.deliveryPerson;
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/delivery/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete delivery person');
  },
};

export const orderService = {
  async getAll(search?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/delivery/orders${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data = await response.json();
    return data.orders || data;
  },

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
  },

  async unassignOrder(orderId: number): Promise<void> {
    const response = await fetch(`${API_URL}/delivery/unassign/${orderId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to unassign order');
  },
};

export const statisticsService = {
  async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/statistics${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch statistics');
    const data = await response.json();
    return data.statistics;
  },
};

export const productsService = {
  async getProducts({ search }: { search?: string } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/products${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return await response.json();
  },

  async createProduct(data: any): Promise<any> {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create product');
    }
    return await response.json();
  },

  async updateProduct(id: number, data: any): Promise<any> {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update product');
    }
    return await response.json();
  },

  async deleteProduct(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete product');
    }
  },
};
