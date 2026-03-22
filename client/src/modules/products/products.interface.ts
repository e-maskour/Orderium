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
  imageUrl?: string;
  saleUnitOfMeasure?: {
    id: number;
    name: string;
    code: string;
    category: string;
  };
  categories?: { id: number; name: string }[];
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
