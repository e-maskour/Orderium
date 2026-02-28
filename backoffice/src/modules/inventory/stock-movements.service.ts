import { apiClient, API_ROUTES } from '../../common';
import { StockMovement } from './inventory.model';
import type {
  CreateMovementDto,
  InternalTransferDto,
  ValidateMovementDto,
} from './inventory.interface';

export type { CreateMovementDto, InternalTransferDto, ValidateMovementDto };

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
    const url = queryString
      ? `${API_ROUTES.STOCK.MOVEMENTS}?${queryString}`
      : API_ROUTES.STOCK.MOVEMENTS;
    const result = await apiClient.get<any[]>(url);
    return (result.data || []).map((m: any) => StockMovement.fromApiResponse(m));
  }

  async getById(id: number): Promise<StockMovement> {
    const result = await apiClient.get<any>(API_ROUTES.STOCK.MOVEMENT_DETAIL(id));
    return StockMovement.fromApiResponse(result.data);
  }

  async create(data: CreateMovementDto): Promise<StockMovement> {
    const result = await apiClient.post<any>(API_ROUTES.STOCK.MOVEMENTS, data);
    return StockMovement.fromApiResponse(result.data);
  }

  async validate(data: ValidateMovementDto): Promise<StockMovement> {
    const result = await apiClient.post<any>(API_ROUTES.STOCK.MOVEMENT_VALIDATE, data);
    return StockMovement.fromApiResponse(result.data);
  }

  async internalTransfer(data: InternalTransferDto): Promise<StockMovement> {
    const result = await apiClient.post<any>(API_ROUTES.STOCK.MOVEMENT_TRANSFER, data);
    return StockMovement.fromApiResponse(result.data);
  }

  async cancel(id: number): Promise<StockMovement> {
    const result = await apiClient.delete<any>(API_ROUTES.STOCK.MOVEMENT_DETAIL(id));
    return StockMovement.fromApiResponse(result.data);
  }
}

export const stockMovementService = new StockMovementService();
