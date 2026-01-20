import { CreateWarehouseDTO, UpdateWarehouseDTO } from './warehouses.interface';
import { WarehouseModel } from './warehouses.model';

const API_URL = '/api/inventory';

export class WarehousesService {
  async getAll(): Promise<WarehouseModel[]> {
    const response = await fetch(`${API_URL}/warehouses`);
    if (!response.ok) throw new Error('Failed to fetch warehouses');
    const data = await response.json();
    const warehouses = data.warehouses || data || [];
    return warehouses.map((wh: any) => WarehouseModel.fromApiResponse(wh));
  }

  async getById(id: number): Promise<WarehouseModel> {
    const response = await fetch(`${API_URL}/warehouses/${id}`);
    if (!response.ok) throw new Error('Failed to fetch warehouse');
    const data = await response.json();
    return WarehouseModel.fromApiResponse(data.warehouse || data);
  }

  async create(data: CreateWarehouseDTO): Promise<WarehouseModel> {
    const response = await fetch(`${API_URL}/warehouses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create warehouse');
    }
    const result = await response.json();
    return WarehouseModel.fromApiResponse(result.warehouse || result);
  }

  async update(id: number, data: UpdateWarehouseDTO): Promise<WarehouseModel> {
    const response = await fetch(`${API_URL}/warehouses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update warehouse');
    }
    const result = await response.json();
    return WarehouseModel.fromApiResponse(result.warehouse || result);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/warehouses/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete warehouse');
    }
  }
}

export const warehousesService = new WarehousesService();
