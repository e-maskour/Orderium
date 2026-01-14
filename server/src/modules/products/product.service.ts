import { findProducts, getTotalProductCount, createProduct, updateProduct, deleteProduct, getProductById } from "./product.repo";
import { Product, CreateProductDTO, UpdateProductDTO } from "./product.model";

interface ProductsResult {
  products: Product[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
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

  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return { 
    products, 
    pagination: {
      total,
      totalPages,
      currentPage: page,
      pageSize,
      hasNext,
      hasPrev
    }
  };
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
