export interface Product {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  price: number;
  cost: number;
  isService: boolean;
  isEnabled: boolean;
  dateCreated: string;
  dateUpdated: string;
  stock?: number | null;
  isPriceChangeAllowed?: boolean;
}

export interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface ProductsResponse {
  products: Product[];
  total?: number;
}
