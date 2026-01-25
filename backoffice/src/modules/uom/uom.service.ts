import { UnitOfMeasure, CreateUomDTO, UpdateUomDTO } from './uom.interface';

const API_URL = '/api';

export class UomService {
  async getAll(category?: string): Promise<UnitOfMeasure[]> {
    const url = category 
      ? `${API_URL}/inventory/uom?category=${encodeURIComponent(category)}`
      : `${API_URL}/inventory/uom`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch units of measure');
    return response.json();
  }

  async getCategories(): Promise<string[]> {
    const response = await fetch(`${API_URL}/inventory/uom/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  }

  async getOne(id: number): Promise<UnitOfMeasure> {
    const response = await fetch(`${API_URL}/inventory/uom/${id}`);
    if (!response.ok) throw new Error('Failed to fetch unit of measure');
    return response.json();
  }

  async create(data: CreateUomDTO): Promise<UnitOfMeasure> {
    const response = await fetch(`${API_URL}/inventory/uom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create unit of measure');
    }

    return response.json();
  }

  async update(id: number, data: UpdateUomDTO): Promise<UnitOfMeasure> {
    const response = await fetch(`${API_URL}/inventory/uom/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update unit of measure');
    }

    return response.json();
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/inventory/uom/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete unit of measure');
    }
  }

  async convertQuantity(quantity: number, fromUomId: number, toUomId: number): Promise<number> {
    const response = await fetch(`${API_URL}/inventory/uom/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity, fromUomId, toUomId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to convert quantity');
    }

    const data = await response.json();
    return data.convertedQuantity;
  }
}

export const uomService = new UomService();
