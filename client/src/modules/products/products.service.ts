import { http } from '@/services/httpClient';
import { GetProductsParams } from './products.interface';
import { Product } from './products.model';

export class ProductsService {
  async getAll(params?: GetProductsParams): Promise<Product[]> {
    const queryString = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined) as [string, string][]
    ).toString();

    const response = await http<{ success: boolean; products: any[]; total: number }>(`/api/products${queryString ? `?${queryString}` : ''}`);
    
    if (response.products && Array.isArray(response.products)) {
      return response.products.map((p: any) => Product.fromApiResponse(p));
    }
    
    return [];
  }
}

export const productsService = new ProductsService();
