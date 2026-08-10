import { http } from '@/services/httpClient';
import { GetProductsParams } from './products.interface';
import { Product } from './products.model';
import { API_ROUTES } from '@/common/api-routes';

export class ProductsService {
  // Returns `Product` models, not the raw interface — `ProductsResponse` in
  // products.interface.ts describes the plain API shape.
  async getAll(params?: GetProductsParams): Promise<{ products: Product[]; total: number }> {
    const { page = 1, pageSize = 50, search, categoryId, brandId } = params ?? {};

    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('perPage', pageSize.toString());

    const filterBody: Record<string, unknown> = {};
    if (search) filterBody.search = search;
    if (categoryId != null) filterBody.categoryIds = [categoryId];
    if (brandId != null) filterBody.brandIds = [brandId];

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

  /**
   * Landing-page rails. Each is a short, fixed-size list the API caps
   * server-side; an unavailable rail resolves to [] so one failing section
   * never takes the page down with it.
   */
  private async getRail(route: string, limit: number): Promise<Product[]> {
    try {
      const response = await http<{ data: Record<string, unknown>[] }>(`${route}?limit=${limit}`);
      return Array.isArray(response.data)
        ? response.data.map((p) => Product.fromApiResponse(p))
        : [];
    } catch {
      return [];
    }
  }

  /** Best sellers across the shop, ranked by revenue. */
  getTopSellers(limit = 3): Promise<Product[]> {
    return this.getRail(API_ROUTES.PORTAL.TOP_SELLERS, limit);
  }

  /** Most recently added products. */
  getNewest(limit = 3): Promise<Product[]> {
    return this.getRail(API_ROUTES.PORTAL.NEWEST_PRODUCTS, limit);
  }

  /** What the signed-in customer orders most — empty for a first-time buyer. */
  getReorder(limit = 3): Promise<Product[]> {
    return this.getRail(API_ROUTES.PORTAL.REORDER_PRODUCTS, limit);
  }
}

export const productsService = new ProductsService();
