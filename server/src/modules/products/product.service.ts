import { findProducts, getTotalProductCount, createProduct, updateProduct, deleteProduct, getProductById } from "./product.repo";
import { Product, CreateProductDTO, UpdateProductDTO } from "./product.model";

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

export async function getProduct(id: number): Promise<Product | null> {
  return await getProductById(id);
}

export async function addProduct(data: CreateProductDTO): Promise<Product> {
  return await createProduct(data);
}

export async function modifyProduct(id: number, data: UpdateProductDTO): Promise<Product | null> {
  return await updateProduct(id, data);
}

export async function removeProduct(id: number): Promise<boolean> {
  return await deleteProduct(id);
}
