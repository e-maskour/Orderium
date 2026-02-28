import {
  CreateStockMovementDTO,
  UpdateStockMovementDTO,
  ValidateMovementDTO,
  InternalTransferDTO,
  StockFilters,
} from './stock.interface';
import { StockMovement, StockQuant } from './stock.model';
import { apiClient, API_ROUTES } from '../../common';

export class StockService {
  async getAllMovements(filters?: StockFilters): Promise<StockMovement[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters?.productId) params.productId = filters.productId;
    if (filters?.warehouseId) params.warehouseId = filters.warehouseId;
    if (filters?.status) params.status = filters.status;
    if (filters?.movementType) params.movementType = filters.movementType;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;

    const response = await apiClient.get<any[]>(API_ROUTES.STOCK.MOVEMENTS, { params });
    return (response.data || []).map((m: any) => StockMovement.fromApiResponse(m));
  }

  async getMovementById(id: number): Promise<StockMovement> {
    const response = await apiClient.get<any>(API_ROUTES.STOCK.MOVEMENT_DETAIL(id));
    return StockMovement.fromApiResponse(response.data);
  }

  async createMovement(data: CreateStockMovementDTO): Promise<StockMovement> {
    const response = await apiClient.post<any>(API_ROUTES.STOCK.MOVEMENTS, data);
    return StockMovement.fromApiResponse(response.data);
  }

  async updateMovement(id: number, data: UpdateStockMovementDTO): Promise<StockMovement> {
    const response = await apiClient.patch<any>(API_ROUTES.STOCK.MOVEMENT_DETAIL(id), data);
    return StockMovement.fromApiResponse(response.data);
  }

  async validateMovement(data: ValidateMovementDTO): Promise<StockMovement> {
    const response = await apiClient.post<any>(API_ROUTES.STOCK.MOVEMENT_VALIDATE, data);
    return StockMovement.fromApiResponse(response.data);
  }

  async cancelMovement(id: number): Promise<StockMovement> {
    const response = await apiClient.delete<any>(API_ROUTES.STOCK.MOVEMENT_DETAIL(id));
    return StockMovement.fromApiResponse(response.data);
  }

  async internalTransfer(data: InternalTransferDTO): Promise<StockMovement> {
    const response = await apiClient.post<any>(API_ROUTES.STOCK.MOVEMENT_TRANSFER, data);
    return StockMovement.fromApiResponse(response.data);
  }

  async getProductStock(productId: number): Promise<StockQuant[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.STOCK.BY_PRODUCT(productId));
    return (response.data || []).map((q: any) => StockQuant.fromApiResponse(q));
  }

  async getWarehouseStock(warehouseId: number): Promise<StockQuant[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.STOCK.BY_WAREHOUSE(warehouseId));
    return (response.data || []).map((q: any) => StockQuant.fromApiResponse(q));
  }

  async getAllStock(): Promise<StockQuant[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.STOCK.ALL);
    return (response.data || []).map((q: any) => StockQuant.fromApiResponse(q));
  }

  async getLowStockProducts(threshold: number = 10): Promise<StockQuant[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.STOCK.LOW, { params: { threshold } });
    return (response.data || []).map((q: any) => StockQuant.fromApiResponse(q));
  }

  async getStockValue(): Promise<{ totalValue: number; productCount: number }> {
    const response = await apiClient.get<{ totalValue: number; productCount: number }>(API_ROUTES.STOCK.VALUE);
    return response.data;
  }
}

export const stockService = new StockService();
