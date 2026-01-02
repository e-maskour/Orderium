import { http } from './httpClient';

interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export const productService = {
  /**
   * Get products with optional filters
   */
  getAll: (params?: GetProductsParams) => {
    const queryString = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined) as [string, string][]
    ).toString();

    return http<any[]>(`/api/products${queryString ? `?${queryString}` : ''}`);
  },
};
