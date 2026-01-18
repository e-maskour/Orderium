import { CreateDeliveryPersonDTO, UpdateDeliveryPersonDTO } from './delivery.interface';
import { DeliveryPerson } from './delivery.model';

const API_URL = '/api';

export class DeliveryPersonService {
  async getAll(): Promise<DeliveryPerson[]> {
    const response = await fetch(`${API_URL}/delivery/persons`);
    if (!response.ok) throw new Error('Failed to fetch delivery persons');
    const data = await response.json();
    const deliveryPersons = data.deliveryPersons || [];
    return deliveryPersons.map((d: any) => DeliveryPerson.fromApiResponse(d));
  }

  async getById(id: number): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery/persons/${id}`);
    if (!response.ok) throw new Error('Failed to fetch delivery person');
    const data = await response.json();
    return DeliveryPerson.fromApiResponse(data.deliveryPerson);
  }

  async create(data: CreateDeliveryPersonDTO): Promise<DeliveryPerson> {
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
    return DeliveryPerson.fromApiResponse(result.deliveryPerson);
  }

  async update(id: number, data: UpdateDeliveryPersonDTO): Promise<DeliveryPerson> {
    const response = await fetch(`${API_URL}/delivery/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update delivery person');
    const result = await response.json();
    return DeliveryPerson.fromApiResponse(result.deliveryPerson);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/delivery/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete delivery person');
    }
  }
}

export const deliveryPersonService = new DeliveryPersonService();
