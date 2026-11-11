import { apiClient, API_ROUTES } from '../../common';
import { InventoryAdjustment } from './inventory.model';
import type { CreateAdjustmentDto, ValidateAdjustmentDto } from './inventory.interface';

export type { CreateAdjustmentDto, ValidateAdjustmentDto };

/** Sort fields accepted by GET inventory/adjustments (server whitelist). */
export type AdjustmentSortField =
  | 'reference'
  | 'name'
  | 'warehouseName'
  | 'adjustmentDate'
  | 'status'
  | 'dateCreated';

export interface AdjustmentListFilters {
  warehouseId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  /** 1-based page. Omit page and limit to fetch every matching row. */
  page?: number;
  limit?: number;
  sortField?: AdjustmentSortField;
  sortOrder?: 'ASC' | 'DESC';
}

export class InventoryAdjustmentService {
  /** All matching adjustments (no pagination unless page/limit are passed). */
  async getAll(filters?: AdjustmentListFilters): Promise<InventoryAdjustment[]> {
    return (await this.getPage(filters)).adjustments;
  }

  /**
   * Server-filtered, sorted and (optionally) paginated adjustments.
   * `total` is the size of the whole filtered set, not just this page.
   */
  async getPage(
    filters?: AdjustmentListFilters,
  ): Promise<{ adjustments: InventoryAdjustment[]; total: number }> {
    const params: Record<string, string | number> = {};
    if (filters?.warehouseId) params.warehouseId = filters.warehouseId;
    if (filters?.status) params.status = filters.status;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.search) params.search = filters.search;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.sortField) params.sortField = filters.sortField;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;

    const result = await apiClient.get<any[]>(API_ROUTES.INVENTORY_ADJUSTMENTS.LIST, { params });
    const adjustments = (result.data || []).map((a: any) => InventoryAdjustment.fromApiResponse(a));
    const meta = (result.metadata ?? {}) as { total?: number };
    return { adjustments, total: meta.total ?? adjustments.length };
  }

  async getById(id: number): Promise<InventoryAdjustment> {
    const result = await apiClient.get<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.DETAIL(id));
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async create(data: CreateAdjustmentDto): Promise<InventoryAdjustment> {
    const result = await apiClient.post<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.CREATE, data);
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async update(id: number, data: Record<string, any>): Promise<InventoryAdjustment> {
    const result = await apiClient.patch<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.UPDATE(id), data);
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async generateCountingList(
    warehouseId: number,
    params?: { search?: string; page?: number; limit?: number },
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    const url = qs
      ? `${API_ROUTES.INVENTORY_ADJUSTMENTS.GENERATE_LIST(warehouseId)}?${qs}`
      : API_ROUTES.INVENTORY_ADJUSTMENTS.GENERATE_LIST(warehouseId);
    const result = await apiClient.get<any>(url);
    return result.data;
  }

  async startCounting(id: number): Promise<InventoryAdjustment> {
    const result = await apiClient.post<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.START(id));
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async validate(data: ValidateAdjustmentDto): Promise<InventoryAdjustment> {
    const result = await apiClient.post<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.VALIDATE, data);
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async cancel(id: number): Promise<InventoryAdjustment> {
    const result = await apiClient.post<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.CANCEL(id));
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.INVENTORY_ADJUSTMENTS.DELETE(id));
  }
}

export const inventoryAdjustmentService = new InventoryAdjustmentService();
