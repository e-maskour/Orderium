import {
  CreateStockMovementDTO,
  UpdateStockMovementDTO,
  ValidateMovementDTO,
  InternalTransferDTO,
  StockFilters,
} from './stock.interface';
import { StockMovementModel, StockQuantModel } from './stock.model';

const API_URL = '/api/inventory';

export class StockService {
  // Stock Movements
  async getAllMovements(filters?: StockFilters): Promise<StockMovementModel[]> {
    const params = new URLSearchParams();
    if (filters?.productId) params.append('productId', filters.productId.toString());
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.movementType) params.append('movementType', filters.movementType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `${API_URL}/movements${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch stock movements');
    const data = await response.json();
    const movements = data.movements || data || [];
    return movements.map((m: any) => StockMovementModel.fromApiResponse(m));
  }

  async getMovementById(id: number): Promise<StockMovementModel> {
    const response = await fetch(`${API_URL}/movements/${id}`);
    if (!response.ok) throw new Error('Failed to fetch stock movement');
    const data = await response.json();
    return StockMovementModel.fromApiResponse(data.movement || data);
  }

  async createMovement(data: CreateStockMovementDTO): Promise<StockMovementModel> {
    const response = await fetch(`${API_URL}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create stock movement');
    }
    const result = await response.json();
    return StockMovementModel.fromApiResponse(result.movement || result);
  }

  async updateMovement(id: number, data: UpdateStockMovementDTO): Promise<StockMovementModel> {
    const response = await fetch(`${API_URL}/movements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update stock movement');
    }
    const result = await response.json();
    return StockMovementModel.fromApiResponse(result.movement || result);
  }

  async validateMovement(data: ValidateMovementDTO): Promise<StockMovementModel> {
    const response = await fetch(`${API_URL}/movements/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate stock movement');
    }
    const result = await response.json();
    return StockMovementModel.fromApiResponse(result.movement || result);
  }

  async cancelMovement(id: number): Promise<StockMovementModel> {
    const response = await fetch(`${API_URL}/movements/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel stock movement');
    }
    const result = await response.json();
    return StockMovementModel.fromApiResponse(result.movement || result);
  }

  async internalTransfer(data: InternalTransferDTO): Promise<StockMovementModel> {
    const response = await fetch(`${API_URL}/movements/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create internal transfer');
    }
    const result = await response.json();
    return StockMovementModel.fromApiResponse(result.movement || result);
  }

  // Stock Quants
  async getProductStock(productId: number): Promise<StockQuantModel[]> {
    const response = await fetch(`${API_URL}/stock/product/${productId}`);
    if (!response.ok) throw new Error('Failed to fetch product stock');
    const data = await response.json();
    const quants = data.quants || data || [];
    return quants.map((q: any) => StockQuantModel.fromApiResponse(q));
  }

  async getWarehouseStock(warehouseId: number): Promise<StockQuantModel[]> {
    const response = await fetch(`${API_URL}/stock/warehouse/${warehouseId}`);
    if (!response.ok) throw new Error('Failed to fetch warehouse stock');
    const data = await response.json();
    const quants = data.quants || data || [];
    return quants.map((q: any) => StockQuantModel.fromApiResponse(q));
  }

  async getAllStock(): Promise<any[]> {
    const response = await fetch(`${API_URL}/stock`);
    if (!response.ok) throw new Error('Failed to fetch all stock');
    const data = await response.json();
    return data.stock || data || [];
  }

  async getLowStockProducts(threshold: number = 10): Promise<any[]> {
    const response = await fetch(`${API_URL}/stock/low?threshold=${threshold}`);
    if (!response.ok) throw new Error('Failed to fetch low stock products');
    const data = await response.json();
    return data.products || data || [];
  }

  async getStockValue(): Promise<{ totalValue: number; productCount: number }> {
    const response = await fetch(`${API_URL}/stock/value`);
    if (!response.ok) throw new Error('Failed to fetch stock value');
    const data = await response.json();
    return data;
  }
}

export const stockService = new StockService();
