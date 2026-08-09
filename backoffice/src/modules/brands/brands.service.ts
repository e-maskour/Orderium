import type { CreateBrandDTO, UpdateBrandDTO } from './brands.interface';
import { Brand } from './brands.model';
import { apiClient, API_ROUTES } from '../../common';

export class BrandsService {
  async getAll(params?: { search?: string; includeInactive?: boolean }): Promise<Brand[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.BRANDS.LIST, {
      params: {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.includeInactive ? { includeInactive: true } : {}),
      },
    });
    return (response.data || []).map((b: any) => Brand.fromApiResponse(b));
  }

  async getById(id: number): Promise<Brand> {
    const response = await apiClient.get<any>(API_ROUTES.BRANDS.DETAIL(id));
    return Brand.fromApiResponse(response.data);
  }

  async getProducts(id: number): Promise<any[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.BRANDS.PRODUCTS(id));
    return response.data || [];
  }

  async create(data: CreateBrandDTO): Promise<Brand> {
    const response = await apiClient.post<any>(API_ROUTES.BRANDS.CREATE, data);
    return Brand.fromApiResponse(response.data);
  }

  async update(id: number, data: UpdateBrandDTO): Promise<Brand> {
    const response = await apiClient.patch<any>(API_ROUTES.BRANDS.UPDATE(id), data);
    return Brand.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.BRANDS.DELETE(id));
  }
}

export const brandsService = new BrandsService();
