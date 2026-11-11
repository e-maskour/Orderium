import { apiClient, API_ROUTES } from '../../common';
import { StockMovement } from './inventory.model';
import type {
  CreateMovementDto,
  InternalTransferDto,
  ValidateMovementDto,
} from './inventory.interface';

export type { CreateMovementDto, InternalTransferDto, ValidateMovementDto };

/** Sort fields accepted by GET inventory/movements (server whitelist). */
export type StockMovementSortField =
  | 'reference'
  | 'movementType'
  | 'productName'
  | 'quantity'
  | 'status'
  | 'dateDone'
  | 'dateCreated';

export interface StockMovementListFilters {
  productId?: number;
  warehouseId?: number;
  status?: string;
  movementType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  /** 1-based page. Omit page and limit to fetch every matching row. */
  page?: number;
  limit?: number;
  sortField?: StockMovementSortField;
  sortOrder?: 'ASC' | 'DESC';
}

export class StockMovementService {
  /** All matching movements (no pagination unless page/limit are passed). */
  async getAll(filters?: StockMovementListFilters): Promise<StockMovement[]> {
    return (await this.getPage(filters)).movements;
  }

  /**
   * Server-filtered, sorted and (optionally) paginated movements.
   * `total` is the size of the whole filtered set, not just this page.
   */
  async getPage(
    filters?: StockMovementListFilters,
  ): Promise<{ movements: StockMovement[]; total: number }> {
    const params: Record<string, string | number> = {};
    if (filters?.productId) params.productId = filters.productId;
    if (filters?.warehouseId) params.warehouseId = filters.warehouseId;
    if (filters?.status) params.status = filters.status;
    if (filters?.movementType) params.movementType = filters.movementType;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.search) params.search = filters.search;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.sortField) params.sortField = filters.sortField;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;

    const result = await apiClient.get<any[]>(API_ROUTES.STOCK.MOVEMENTS, { params });
    const movements = (result.data || []).map((m: any) => StockMovement.fromApiResponse(m));
    const meta = (result.metadata ?? {}) as { total?: number };
    return { movements, total: meta.total ?? movements.length };
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
