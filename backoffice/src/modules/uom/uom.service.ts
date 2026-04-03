import type { CreateUomDTO, UpdateUomDTO } from './uom.interface';
import { UnitOfMeasure } from './uom.model';
import { apiClient, API_ROUTES } from '../../common';

export class UomService {
  async getAll(category?: string): Promise<UnitOfMeasure[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.UOM.LIST, {
      params: category ? { category } : undefined,
    });
    return (response.data || []).map((u: any) => UnitOfMeasure.fromApiResponse(u));
  }

  async getCategories(): Promise<string[]> {
    const response = await apiClient.get<string[]>(API_ROUTES.UOM.CATEGORIES);
    return response.data;
  }

  async getOne(id: number): Promise<UnitOfMeasure> {
    const response = await apiClient.get<any>(API_ROUTES.UOM.DETAIL(id));
    return UnitOfMeasure.fromApiResponse(response.data);
  }

  async create(data: CreateUomDTO): Promise<UnitOfMeasure> {
    const response = await apiClient.post<any>(API_ROUTES.UOM.CREATE, data);
    return UnitOfMeasure.fromApiResponse(response.data);
  }

  async update(id: number, data: UpdateUomDTO): Promise<UnitOfMeasure> {
    const response = await apiClient.patch<any>(API_ROUTES.UOM.UPDATE(id), data);
    return UnitOfMeasure.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.UOM.DELETE(id));
  }

  async convertQuantity(quantity: number, fromUomId: number, toUomId: number): Promise<number> {
    const response = await apiClient.post<any>(API_ROUTES.UOM.CONVERT, {
      quantity,
      fromUomId,
      toUomId,
    });
    return response.data.convertedQuantity;
  }
}

export const uomService = new UomService();
