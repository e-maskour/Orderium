import { ProductsResponse, GetProductsParams, CreateProductDTO, UpdateProductDTO } from './products.interface';
import { Product } from './products.model';

const API_URL = '/api';

export class ProductsService {
  async getProducts(params: GetProductsParams = {}): Promise<ProductsResponse> {
    const { search = '', page = 1, limit = 50 } = params;
    
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    const queryString = queryParams.toString();
    const response = await fetch(`${API_URL}/products${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();
    
    // Transform products using model
    if (data.products) {
      data.products = data.products.map((p: any) => Product.fromApiResponse(p));
    }
    
    return data;
  }

  async createProduct(data: CreateProductDTO): Promise<{ product: Product }> {
    const response = await fetch(`${API_URL}/products`, {
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
      method: 'PUT',
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
}

export const productsService = new ProductsService();
