import { apiClient, API_ROUTES } from '../../common';
import {
  IPosProduct,
  IPosCustomer,
  CreatePosOrderDTO,
  IPosProductsResponse,
} from './pos.interface';
import { Order } from '../orders/orders.model';

class PosService {
  /**
   * Fetch paginated enabled, non-service products for POS display.
   */
  async getProducts(
    params: { page?: number; perPage?: number; search?: string } = {},
  ): Promise<IPosProductsResponse> {
    const { page = 1, perPage = 50, search } = params;
    const filterBody: Record<string, unknown> = {};
    if (search) filterBody.search = search;

    const response = await apiClient.post<any[]>(API_ROUTES.PRODUCTS.FILTER, filterBody, {
      params: { page, perPage },
    });

    const products = (response.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      price: p.price || 0,
      cost: p.cost ?? undefined,
      stock: p.stock != null ? parseInt(p.stock) : undefined,
      isService: p.isService,
      isEnabled: p.isEnabled,
      isPriceChangeAllowed: p.isPriceChangeAllowed,
      categoryId: p.categoryId,
      categories: Array.isArray(p.categories)
        ? p.categories.map((c: any) => ({ id: c.id, name: c.name }))
        : [],
      imageUrl: p.imageUrl,
      saleUnitOfMeasure: p.saleUnitOfMeasure,
    }));

    const total = (response.metadata as any)?.total || 0;
    return { products, total };
  }

  /**
   * Fetch customers (partners with type=customer) for POS customer selection.
   */
  async getCustomers(search?: string): Promise<IPosCustomer[]> {
    const params: Record<string, any> = { type: 'customer' };
    if (search) params.search = search;
    const response = await apiClient.get<any[]>(API_ROUTES.PARTNERS.LIST, { params });
    return (response.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      phoneNumber: p.phoneNumber ?? '',
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
    }));
  }

  /**
   * Create a POS order.
   */
  async createOrder(data: CreatePosOrderDTO): Promise<Order> {
    const response = await apiClient.post<any>(API_ROUTES.ORDERS.CREATE, data);
    return Order.fromApiResponse(response.data);
  }
}

export const posService = new PosService();
