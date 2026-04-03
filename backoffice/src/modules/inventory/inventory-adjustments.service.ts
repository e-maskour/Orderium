import { apiClient, API_ROUTES } from '../../common';
import { InventoryAdjustment } from './inventory.model';
import type { CreateAdjustmentDto, ValidateAdjustmentDto } from './inventory.interface';

export type { CreateAdjustmentDto, ValidateAdjustmentDto };

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
    const url = queryString
      ? `${API_ROUTES.INVENTORY_ADJUSTMENTS.LIST}?${queryString}`
      : API_ROUTES.INVENTORY_ADJUSTMENTS.LIST;
    const result = await apiClient.get<any[]>(url);
    return (result.data || []).map((a: any) => InventoryAdjustment.fromApiResponse(a));
  }

  async getById(id: number): Promise<InventoryAdjustment> {
    const result = await apiClient.get<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.DETAIL(id));
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async create(data: CreateAdjustmentDto): Promise<InventoryAdjustment> {
    const result = await apiClient.post<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.CREATE, data);
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async generateCountingList(warehouseId: number): Promise<any> {
    const result = await apiClient.get<any>(
      API_ROUTES.INVENTORY_ADJUSTMENTS.GENERATE_LIST(warehouseId),
    );
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
