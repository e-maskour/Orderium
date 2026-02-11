import { ProductsResponse, GetProductsParams, CreateProductDTO, UpdateProductDTO } from './products.interface';
import { Product } from './products.model';

const API_URL = '/api';

export class ProductsService {
  async getProducts(params: GetProductsParams = {}): Promise<ProductsResponse> {
    const { 
      search = '', 
      code = '',
      stockFilter,
      categoryIds = [],
      isService,
      page = 1, 
      limit = 50 
    } = params;
    
    // Build query params for pagination
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('perPage', limit.toString());
    
    // Build request body for filters
    const filterBody: any = {};
    if (search) filterBody.search = search;
    if (code) filterBody.code = code;
    if (stockFilter) filterBody.stockFilter = stockFilter;
    if (categoryIds.length > 0) filterBody.categoryIds = categoryIds;
    if (isService !== undefined) filterBody.isService = isService;
    
    const queryString = queryParams.toString();
    const response = await fetch(`${API_URL}/products/filter${queryString ? `?${queryString}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filterBody),
    });
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();
    
    // Transform products using model
    if (data.products) {
      data.products = data.products.map((p: any) => Product.fromApiResponse(p));
    }
    
    // Transform page-based pagination
    const totalPages = Math.ceil((data.totalCount || 0) / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    return {
      products: data.products || [],
      pagination: {
        page,
        limit,
        total: data.totalCount || 0,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  async getProduct(id: number): Promise<Product> {
    const response = await fetch(`${API_URL}/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    const data = await response.json();
    
    // Transform product using model
    return Product.fromApiResponse(data.product || data);
  }

  async createProduct(data: CreateProductDTO): Promise<{ product: Product }> {
    const response = await fetch(`${API_URL}/products/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create product');
    }
    const result = await response.json();
    
    // Transform response using model
    if (result.product) {
      result.product = Product.fromApiResponse(result.product);
    }
    
    return result;
  }

  async updateProduct(id: number, data: UpdateProductDTO): Promise<{ product: Product }> {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update product');
    }
    const result = await response.json();
    
    // Transform response using model
    if (result.product) {
      result.product = Product.fromApiResponse(result.product);
    }
    
    return result;
  }

  async deleteProduct(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete product');
    }
  }

  async checkCodeExists(code: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/products?search=${encodeURIComponent(code)}&limit=1`);
      if (!response.ok) return false;
      const data = await response.json();
      // Check if any product has exactly this code
      return data.products?.some((p: any) => p.code === code) || false;
    } catch {
      return false;
    }
  }

  async exportToXlsx(): Promise<Blob> {
    const response = await fetch(`${API_URL}/products/export/xlsx`);
    if (!response.ok) throw new Error('Failed to export products');
    return response.blob();
  }

  async downloadTemplate(): Promise<Blob> {
    const response = await fetch(`${API_URL}/products/import/template`);
    if (!response.ok) throw new Error('Failed to download template');
    return response.blob();
  }

  async importFromXlsx(file: File): Promise<{ success: boolean; imported: number; updated: number; failed: number; errors: any[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/products/import/xlsx`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to import products');
    }

    return response.json();
  }
}

export const productsService = new ProductsService();
