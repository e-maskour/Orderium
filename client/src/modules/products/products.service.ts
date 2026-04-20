import { http } from '@/services/httpClient';
import { GetProductsParams, ProductsResponse } from './products.interface';
import { Product } from './products.model';
import { API_ROUTES } from '@/common/api-routes';

export class ProductsService {
  async getAll(params?: GetProductsParams): Promise<ProductsResponse> {
    const { page = 1, pageSize = 50, search, categoryId } = params ?? {};

    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('perPage', pageSize.toString());

    const filterBody: Record<string, unknown> = {};
    if (search) filterBody.search = search;
    if (categoryId != null) filterBody.categoryIds = [categoryId];

    const response = await http<{
      code: string;
      status: number;
      message: string;
      data: Record<string, unknown>[];
      metadata?: { total: number; limit: number; offset: number } | null;
    }>(`${API_ROUTES.PRODUCTS.FILTER}?${queryParams.toString()}`, {
      method: 'POST',
      body: JSON.stringify(filterBody),
    });

    const items = Array.isArray(response.data)
      ? response.data.map((p) => Product.fromApiResponse(p))
      : [];
    const total = response.metadata?.total ?? items.length;
    return { products: items, total };
  }
}

export const productsService = new ProductsService();
