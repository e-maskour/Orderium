import { http } from '@/services/httpClient';
import { GetProductsParams } from './products.interface';
import { Product } from './products.model';

export class ProductsService {
  async getAll(params?: GetProductsParams): Promise<Product[]> {
    const { page = 1, pageSize = 50, search } = params ?? {};
    const offset = (page - 1) * pageSize;

    // Build query params for pagination
    const queryParams = new URLSearchParams();
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', pageSize.toString());

    // Build request body for filters
    const filterBody: Record<string, string> = {};
    if (search) filterBody.search = search;

    const response = await http<{ success: boolean; products: Record<string, unknown>[]; total: number }>(
      `/api/products/filter?${queryParams.toString()}`,
      {
        method: 'POST',
        body: JSON.stringify(filterBody),
      }
    );

    if (response.products && Array.isArray(response.products)) {
      return response.products.map((p) => Product.fromApiResponse(p));
    }

    return [];
  }
}

export const productsService = new ProductsService();
