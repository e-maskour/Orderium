const API_URL = '/api';

export interface AdjustmentLine {
  id?: number;
  productId: number;
  productName?: string;
  productCode?: string;
  theoreticalQuantity: number;
  countedQuantity: number;
  difference: number;
  lotNumber?: string;
  serialNumber?: string;
  notes?: string;
}

export interface InventoryAdjustment {
  id: number;
  reference: string;
  name: string;
  warehouseId: number;
  warehouseName?: string;
  status: 'draft' | 'in_progress' | 'done' | 'cancelled';
  adjustmentDate: string | null;
  userId: number | null;
  notes: string;
  lines: AdjustmentLine[];
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateAdjustmentDto {
  name: string;
  warehouseId: number;
  notes?: string;
}

export interface ValidateAdjustmentDto {
  adjustmentId: number;
  lines: Array<{
    productId: number;
    countedQuantity: number;
    lotNumber?: string;
    serialNumber?: string;
    notes?: string;
  }>;
}

export class InventoryAdjustmentService {
  async getAll(filters?: {
    warehouseId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<InventoryAdjustment[]> {
    const params = new URLSearchParams();
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const response = await fetch(`${API_URL}/inventory/adjustments${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch inventory adjustments');
    return await response.json();
  }

  async getById(id: number): Promise<InventoryAdjustment> {
    const response = await fetch(`${API_URL}/inventory/adjustments/${id}`);
    if (!response.ok) throw new Error('Failed to fetch adjustment details');
    return await response.json();
  }

  async create(data: CreateAdjustmentDto): Promise<InventoryAdjustment> {
    const response = await fetch(`${API_URL}/inventory/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create adjustment');
    }
    return await response.json();
  }

  async generateCountingList(warehouseId: number): Promise<any> {
    const response = await fetch(`${API_URL}/inventory/adjustments/generate-list/${warehouseId}`);
    if (!response.ok) throw new Error('Failed to generate counting list');
    return await response.json();
  }

  async startCounting(id: number): Promise<InventoryAdjustment> {
    const response = await fetch(`${API_URL}/inventory/adjustments/${id}/start`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start counting');
    }
    return await response.json();
  }

  async validate(data: ValidateAdjustmentDto): Promise<InventoryAdjustment> {
    const response = await fetch(`${API_URL}/inventory/adjustments/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate adjustment');
    }
    return await response.json();
  }

  async cancel(id: number): Promise<InventoryAdjustment> {
    const response = await fetch(`${API_URL}/inventory/adjustments/${id}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel adjustment');
    }
    return await response.json();
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/inventory/adjustments/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete adjustment');
    }
  }
}

export const inventoryAdjustmentService = new InventoryAdjustmentService();
