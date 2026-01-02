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
  async getAll(): Promise<any[]> {
    const response = await fetch(`${API_URL}/delivery/orders`);
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
