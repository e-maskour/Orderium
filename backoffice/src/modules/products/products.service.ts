import { ProductsResponse, GetProductsParams, CreateProductDTO, UpdateProductDTO } from './products.interface';
import { Product } from './products.model';
import { apiClient, API_ROUTES } from '../../common';

export class ProductsService {
  async getProducts(params: GetProductsParams = {}): Promise<ProductsResponse> {
    const {
      search = '',
      code = '',
      stockFilter,
      categoryIds = [],
      isService,
      minPrice,
      maxPrice,
      page = 1,
      limit = 50
    } = params;

    const filterBody: Record<string, unknown> = {};
    if (search) filterBody.search = search;
    if (code) filterBody.code = code;
    if (stockFilter) filterBody.stockFilter = stockFilter;
    if (categoryIds.length > 0) filterBody.categoryIds = categoryIds;
    if (isService !== undefined) filterBody.isService = isService;
    if (minPrice !== undefined) filterBody.minPrice = minPrice;
    if (maxPrice !== undefined) filterBody.maxPrice = maxPrice;

    const response = await apiClient.post<Product[]>(API_ROUTES.PRODUCTS.FILTER, filterBody, {
      params: { page, perPage: limit },
    });

    const products = (response.data || []).map((p: any) => Product.fromApiResponse(p));
    const total = (response.metadata as any)?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: (response.metadata as any)?.hasNext || false,
        hasPrev: (response.metadata as any)?.hasPrev || false,
      },
    };
  }

  async getProduct(id: number): Promise<Product> {
    const response = await apiClient.get<Product>(API_ROUTES.PRODUCTS.DETAIL(id));
    return Product.fromApiResponse(response.data);
  }

  async createProduct(data: CreateProductDTO): Promise<{ product: Product }> {
    const response = await apiClient.post<Product>(API_ROUTES.PRODUCTS.CREATE, data);
    return { product: Product.fromApiResponse(response.data) };
  }

  async updateProduct(id: number, data: UpdateProductDTO): Promise<{ product: Product }> {
    const response = await apiClient.patch<Product>(API_ROUTES.PRODUCTS.UPDATE(id), data);
    return { product: Product.fromApiResponse(response.data) };
  }

  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.PRODUCTS.DELETE(id));
  }

  async checkCodeExists(code: string): Promise<boolean> {
    try {
      const response = await apiClient.get<Product[]>(API_ROUTES.PRODUCTS.LIST, {
        params: { search: code, limit: 1 },
      });
      return (response.data || []).some((p: any) => p.code === code);
    } catch {
      return false;
    }
  }

  async exportToXlsx(): Promise<Blob> {
    const response = await apiClient.raw('GET', API_ROUTES.PRODUCTS.EXPORT_XLSX);
    return response.blob();
  }

  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.raw('GET', API_ROUTES.PRODUCTS.IMPORT_TEMPLATE);
    return response.blob();
  }

  async importFromXlsx(file: File): Promise<{ success: boolean; imported: number; updated: number; failed: number; errors: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.upload<{ imported: number; updated: number; failed: number; errors: any[] }>(
      API_ROUTES.PRODUCTS.IMPORT_XLSX,
      formData,
    );
    return { success: true, ...response.data };
  }

  async uploadImage(productId: number, file: File): Promise<{ product: Product; imageUrl: string; publicId: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.upload<any>(API_ROUTES.PRODUCTS.IMAGE_UPLOAD(productId), formData);
    return {
      product: Product.fromApiResponse(response.data.product),
      imageUrl: response.data.imageUrl,
      publicId: response.data.publicId,
    };
  }

  async deleteImage(productId: number): Promise<void> {
    await apiClient.delete(API_ROUTES.PRODUCTS.IMAGE_DELETE(productId));
  }

  async updateProductImage(productId: number, imageUrl: string, imagePublicId?: string): Promise<Product> {
    const response = await apiClient.patch<any>(
      API_ROUTES.PRODUCTS.UPDATE(productId),
      { imageUrl, imagePublicId },
    );
    return Product.fromApiResponse(response.data);
  }
}

export const productsService = new ProductsService();
