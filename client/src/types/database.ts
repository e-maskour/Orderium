// Re-export Product type from modules for centralized type usage
export type { Product, GetProductsParams, ProductsResponse } from '@/modules/products';

// Additional database-related types can be added here
export type ProductFilters = {
  category: string;
  search: string;
};

export type ProductCategory = 'all' | 'products' | 'services';
