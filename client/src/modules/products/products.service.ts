import { http } from '@/services/httpClient';
import { GetProductsParams, ProductsResponse } from './products.interface';
import { Product } from './products.model';

export class ProductsService {
  async getAll(params?: GetProductsParams): Promise<ProductsResponse> {
    const { page = 1, pageSize = 50, search } = params ?? {};
    const offset = (page - 1) * pageSize;

    const queryParams = new URLSearchParams();
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', pageSize.toString());

    const filterBody: Record<string, string> = {};
    if (search) filterBody.search = search;

    const response = await http<{ code: string; status: number; message: string; data: Record<string, unknown>[]; metadata?: { total: number; limit: number; offset: number } | null }>(
      `/api/products/filter?${queryParams.toString()}`,
      {
        method: 'POST',
        body: JSON.stringify(filterBody),
      }
    );

    const items = Array.isArray(response.data) ? response.data.map((p) => Product.fromApiResponse(p)) : [];
    const total = response.metadata?.total ?? items.length;
    return { products: items, total };
  }
}

export const productsService = new ProductsService();
