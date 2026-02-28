import type { CreateCategoryDTO, UpdateCategoryDTO } from './categories.interface';
import { Category } from './categories.model';
import { apiClient, API_ROUTES } from '../../common';

export class CategoriesService {
  async getAll(type?: string): Promise<Category[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.CATEGORIES.LIST, {
      params: type ? { type } : undefined,
    });
    return (response.data || []).map((c: any) => Category.fromApiResponse(c));
  }

  async getHierarchy(type?: string): Promise<Category[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.CATEGORIES.HIERARCHY, {
      params: type ? { type } : undefined,
    });
    return (response.data || []).map((c: any) => Category.fromApiResponse(c));
  }

  async getByType(type: string): Promise<Category[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.CATEGORIES.BY_TYPE(type));
    return (response.data || []).map((c: any) => Category.fromApiResponse(c));
  }

  async getById(id: number): Promise<Category> {
    const response = await apiClient.get<any>(API_ROUTES.CATEGORIES.DETAIL(id));
    return Category.fromApiResponse(response.data);
  }

  async create(data: CreateCategoryDTO): Promise<Category> {
    const response = await apiClient.post<any>(API_ROUTES.CATEGORIES.CREATE, data);
    return Category.fromApiResponse(response.data);
  }

  async update(id: number, data: UpdateCategoryDTO): Promise<Category> {
    const response = await apiClient.put<any>(API_ROUTES.CATEGORIES.UPDATE(id), data);
    return Category.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.CATEGORIES.DELETE(id));
  }
}

export const categoriesService = new CategoriesService();
