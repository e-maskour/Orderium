import type {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  GetCategoriesParams,
  CategoriesPagination,
} from './categories.interface';
import { Category } from './categories.model';
import { apiClient, API_ROUTES } from '../../common';

export interface PaginatedCategoriesResponse {
  categories: Category[];
  pagination: CategoriesPagination;
}

export class CategoriesService {
  async getAll(type?: string): Promise<Category[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.CATEGORIES.LIST, {
      params: type ? { type } : undefined,
    });
    return (response.data || []).map((c: any) => Category.fromApiResponse(c));
  }

  /**
   * Server-side paginated + searched root categories, children nested.
   * Search is resolved by the API (a root is returned when it or any
   * descendant matches), so no client-side filtering is needed.
   */
  async getPaginated(params: GetCategoriesParams = {}): Promise<PaginatedCategoriesResponse> {
    const { search = '', type, page = 1, limit = 50 } = params;

    const query: Record<string, string | number | boolean | undefined> = {
      page,
      perPage: limit,
    };
    if (search) query.search = search;
    if (type) query.type = type;

    const response = await apiClient.get<any[]>(API_ROUTES.CATEGORIES.PAGINATED, {
      params: query,
    });

    const categories = (response.data || []).map((c: any) => Category.fromApiResponse(c));
    const metadata = (response.metadata as any) || {};
    const total = metadata.total || 0;

    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: metadata.hasNext || false,
        hasPrev: metadata.hasPrev || false,
      },
    };
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
    const response = await apiClient.patch<any>(API_ROUTES.CATEGORIES.UPDATE(id), data);
    return Category.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.CATEGORIES.DELETE(id));
  }
}

export const categoriesService = new CategoriesService();
