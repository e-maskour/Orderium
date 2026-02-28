import { CreateWarehouseDTO, UpdateWarehouseDTO } from './warehouses.interface';
import { Warehouse } from './warehouses.model';
import { apiClient, API_ROUTES } from '../../common';

export class WarehousesService {
  async getAll(): Promise<Warehouse[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.WAREHOUSES.LIST);
    return (response.data || []).map((wh: any) => Warehouse.fromApiResponse(wh));
  }

  async getById(id: number): Promise<Warehouse> {
    const response = await apiClient.get<any>(API_ROUTES.WAREHOUSES.DETAIL(id));
    return Warehouse.fromApiResponse(response.data);
  }

  async create(data: CreateWarehouseDTO): Promise<Warehouse> {
    const response = await apiClient.post<any>(API_ROUTES.WAREHOUSES.CREATE, data);
    return Warehouse.fromApiResponse(response.data);
  }

  async update(id: number, data: UpdateWarehouseDTO): Promise<Warehouse> {
    const response = await apiClient.patch<any>(API_ROUTES.WAREHOUSES.UPDATE(id), data);
    return Warehouse.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.WAREHOUSES.DELETE(id));
  }
}

export const warehousesService = new WarehousesService();
