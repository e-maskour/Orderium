import { findProducts } from "./product.repo";
import { Product } from "./product.model";

export async function getProducts(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<Product[]> {

  const page = Math.max(1, params.page);
  const pageSize = Math.min(100, params.pageSize);

  const offset = (page - 1) * pageSize;

  return findProducts(pageSize, offset, params.search);
}
