export interface Product {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  price: number;
  cost: number;
  stock?: number | null;
  isService: boolean;
  isEnabled: boolean;
  isPriceChangeAllowed: boolean;
  defaultTax: number;
  minPrice: number;
  dateCreated: string;
  dateUpdated: string;
  imageUrl?: string | null;
}

export interface ProductsResponse {
  products: Product[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface GetProductsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateProductDTO {
  name: string;
  code?: string | null;
  description?: string | null;
  price: number;
  cost: number;
  stock?: number | null;
  isService: boolean;
  isEnabled: boolean;
  isPriceChangeAllowed: boolean;
  defaultTax?: number;
  minPrice?: number;
  imageUrl?: string | null;
}

export interface UpdateProductDTO {
  name?: string;
  code?: string | null;
  description?: string | null;
  price?: number;
  cost?: number;
  stock?: number | null;
  isService?: boolean;
  isEnabled?: boolean;
  isPriceChangeAllowed?: boolean;
  defaultTax?: number;
  minPrice?: number;
  imageUrl?: string | null;
}
