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
  saleTax?: number;
  purchaseTax?: number;
  minPrice: number;
  warehouseId?: number | null;
  dateCreated: string;
  dateUpdated: string;
  imageUrl?: string | null;
  saleUnit?: string;
  purchaseUnit?: string;
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
  saleTax?: number;
  purchaseTax?: number;
  minPrice?: number;
  warehouseId?: number | null;
  imageUrl?: string | null;
  saleUnit?: string;
  purchaseUnit?: string;
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
  saleTax?: number;
  purchaseTax?: number;
  minPrice?: number;
  warehouseId?: number | null;
  imageUrl?: string | null;
  saleUnit?: string;
  purchaseUnit?: string;
}
