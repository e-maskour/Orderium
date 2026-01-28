const API_URL = '/api';

export interface StockMovement {
  id: number;
  reference: string;
  movementType: 'receipt' | 'delivery' | 'internal' | 'adjustment' | 'production_in' | 'production_out' | 'return_in' | 'return_out' | 'scrap';
  productId: number;
  productName?: string;
  productCode?: string;
  sourceWarehouseId: number | null;
  sourceWarehouseName?: string;
  destWarehouseId: number | null;
  destWarehouseName?: string;
  quantity: number;
  unitOfMeasureId: number | null;
  unitOfMeasureCode?: string;
  status: 'draft' | 'waiting' | 'confirmed' | 'assigned' | 'done' | 'cancelled';
  dateScheduled: string | null;
  dateDone: string | null;
  origin: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  notes: string | null;
  partnerName: string | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateMovementDto {
  movementType: string;
  productId: number;
  sourceWarehouseId?: number;
  destWarehouseId?: number;
  quantity: number;
  unitOfMeasureId?: number;
  dateScheduled?: string;
  origin?: string;
  lotNumber?: string;
  serialNumber?: string;
  notes?: string;
  partnerName?: string;
}

export interface InternalTransferDto {
  productId: number;
  sourceWarehouseId: number;
  destWarehouseId: number;
  quantity: number;
  notes?: string;
}

export interface ValidateMovementDto {
  movementId: number;
}

export class StockMovementService {
  async getAll(filters?: {
    productId?: number;
    warehouseId?: number;
    status?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StockMovement[]> {
    const params = new URLSearchParams();
    if (filters?.productId) params.append('productId', filters.productId.toString());
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.movementType) params.append('movementType', filters.movementType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const response = await fetch(`${API_URL}/inventory/movements${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch stock movements');
    return await response.json();
  }

  async getById(id: number): Promise<StockMovement> {
    const response = await fetch(`${API_URL}/inventory/movements/${id}`);
    if (!response.ok) throw new Error('Failed to fetch movement details');
    return await response.json();
  }

  async create(data: CreateMovementDto): Promise<StockMovement> {
    const response = await fetch(`${API_URL}/inventory/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create movement');
    }
    return await response.json();
  }

  async validate(data: ValidateMovementDto): Promise<StockMovement> {
    const response = await fetch(`${API_URL}/inventory/movements/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate movement');
    }
    return await response.json();
  }

  async internalTransfer(data: InternalTransferDto): Promise<any> {
    const response = await fetch(`${API_URL}/inventory/movements/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create transfer');
    }
    return await response.json();
  }

  async cancel(id: number): Promise<StockMovement> {
    const response = await fetch(`${API_URL}/inventory/movements/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel movement');
    }
    return await response.json();
  }
}

export const stockMovementService = new StockMovementService();
