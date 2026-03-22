// Re-export Product type from modules for centralized type usage
export type { Product, GetProductsParams, ProductsResponse } from '@/modules/products';

// Additional database-related types can be added here
export type ProductFilters = {
  categoryId: number | null;
  search: string;
};
