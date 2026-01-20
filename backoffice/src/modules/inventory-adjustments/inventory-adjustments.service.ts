import {
  CreateInventoryAdjustmentDTO,
  UpdateInventoryAdjustmentDTO,
  ValidateAdjustmentDTO,
  AdjustmentFilters,
} from './inventory-adjustments.interface';
import { InventoryAdjustmentModel } from './inventory-adjustments.model';

const API_URL = '/api/inventory';

export class InventoryAdjustmentsService {
  async getAll(filters?: AdjustmentFilters): Promise<InventoryAdjustmentModel[]> {
    const params = new URLSearchParams();
    if (filters?.locationId) params.append('locationId', filters.locationId.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `${API_URL}/adjustments${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch inventory adjustments');
    const data = await response.json();
    const adjustments = data.adjustments || data || [];
    return adjustments.map((adj: any) => InventoryAdjustmentModel.fromApiResponse(adj));
  }

  async getById(id: number): Promise<InventoryAdjustmentModel> {
    const response = await fetch(`${API_URL}/adjustments/${id}`);
    if (!response.ok) throw new Error('Failed to fetch inventory adjustment');
    const data = await response.json();
    return InventoryAdjustmentModel.fromApiResponse(data.adjustment || data);
  }

  async create(data: CreateInventoryAdjustmentDTO): Promise<InventoryAdjustmentModel> {
    const response = await fetch(`${API_URL}/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create inventory adjustment');
    }
    const result = await response.json();
    return InventoryAdjustmentModel.fromApiResponse(result.adjustment || result);
  }

  async update(id: number, data: UpdateInventoryAdjustmentDTO): Promise<InventoryAdjustmentModel> {
    const response = await fetch(`${API_URL}/adjustments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update inventory adjustment');
    }
    const result = await response.json();
    return InventoryAdjustmentModel.fromApiResponse(result.adjustment || result);
  }

  async startCounting(id: number): Promise<InventoryAdjustmentModel> {
    const response = await fetch(`${API_URL}/adjustments/${id}/start-counting`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start counting');
    }
    const result = await response.json();
    return InventoryAdjustmentModel.fromApiResponse(result.adjustment || result);
  }

  async validate(data: ValidateAdjustmentDTO): Promise<InventoryAdjustmentModel> {
    const response = await fetch(`${API_URL}/adjustments/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate inventory adjustment');
    }
    const result = await response.json();
    return InventoryAdjustmentModel.fromApiResponse(result.adjustment || result);
  }

  async cancel(id: number): Promise<InventoryAdjustmentModel> {
    const response = await fetch(`${API_URL}/adjustments/${id}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel inventory adjustment');
    }
    const result = await response.json();
    return InventoryAdjustmentModel.fromApiResponse(result.adjustment || result);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/adjustments/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete inventory adjustment');
    }
  }

  async generateCountingList(locationId: number): Promise<any[]> {
    const response = await fetch(`${API_URL}/adjustments/counting-list/${locationId}`);
    if (!response.ok) throw new Error('Failed to generate counting list');
    const data = await response.json();
    return data.list || data || [];
  }
}

export const inventoryAdjustmentsService = new InventoryAdjustmentsService();
