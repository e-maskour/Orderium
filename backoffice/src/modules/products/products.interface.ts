export interface IProduct {
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
  categories?: { id: number; name: string; type?: string }[];
  brandId?: number | null;
  brand?: { id: number; name: string; logoUrl?: string | null } | null;
}

export interface ProductsResponse {
  products: IProduct[];
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
  code?: string;
  stockFilter?: 'negative' | 'zero' | 'positive';
  categoryIds?: number[];
  brandIds?: number[];
  isService?: boolean;
  sortField?: ProductSortField;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

/** Sortable columns accepted by `POST /api/products/filter`. */
export type ProductSortField = 'name' | 'code' | 'price' | 'cost' | 'stock' | 'dateCreated';

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
  brandId?: number | null;
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
  brandId?: number | null;
}
