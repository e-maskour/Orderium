import { findProducts, getTotalProductCount } from "./product.repo";
import { Product } from "./product.model";

interface ProductsResult {
  products: Product[];
  total: number;
}

export async function getProducts(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<ProductsResult> {

  const page = Math.max(1, params.page);
  const pageSize = Math.min(100, params.pageSize);

  const offset = (page - 1) * pageSize;

  const [products, total] = await Promise.all([
    findProducts(pageSize, offset, params.search),
    getTotalProductCount(params.search)
  ]);

  return { products, total };
}
