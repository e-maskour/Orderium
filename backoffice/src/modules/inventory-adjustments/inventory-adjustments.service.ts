import {
  CreateInventoryAdjustmentDTO,
  UpdateInventoryAdjustmentDTO,
  ValidateAdjustmentDTO,
  AdjustmentFilters,
} from './inventory-adjustments.interface';
import { InventoryAdjustment } from './inventory-adjustments.model';
import { apiClient, API_ROUTES } from '../../common';


export class InventoryAdjustmentsService {
  async getAll(filters?: AdjustmentFilters): Promise<InventoryAdjustment[]> {
    const params = new URLSearchParams();
    if (filters?.locationId) params.append('locationId', filters.locationId.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = queryString
      ? `${API_ROUTES.INVENTORY_ADJUSTMENTS.LIST}?${queryString}`
      : API_ROUTES.INVENTORY_ADJUSTMENTS.LIST;
    const data = await apiClient.get<any[]>(url);
    const adjustments = data.data || [];
    return adjustments.map((adj: any) => InventoryAdjustment.fromApiResponse(adj));
  }

  async getById(id: number): Promise<InventoryAdjustment> {
    const data = await apiClient.get<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.DETAIL(id));
    return InventoryAdjustment.fromApiResponse(data.data);
  }

  async create(data: CreateInventoryAdjustmentDTO): Promise<InventoryAdjustment> {
    const result = await apiClient.post<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.CREATE, data);
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async update(id: number, data: UpdateInventoryAdjustmentDTO): Promise<InventoryAdjustment> {
    const result = await apiClient.patch<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.UPDATE(id), data);
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async startCounting(id: number): Promise<InventoryAdjustment> {
    const result = await apiClient.post<any>(API_ROUTES.INVENTORY_ADJUSTMENTS.START_COUNTING(id));
    return InventoryAdjustment.fromApiResponse(result.data);
  }

  async validate(data: ValidateAdjustmentDTO): Promise<InventoryAdjustment> {
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

  async generateCountingList(locationId: number): Promise<any[]> {
    const data = await apiClient.get<any[]>(API_ROUTES.INVENTORY_ADJUSTMENTS.COUNTING_LIST(locationId));
    return data.data || [];
  }
}

export const inventoryAdjustmentsService = new InventoryAdjustmentsService();
