import { apiClient, API_ROUTES } from '../../common';
import { IPosProduct, IPosCustomer, CreatePosOrderDTO } from './pos.interface';
import { Order } from '../orders/orders.model';

class PosService {
    /**
     * Fetch all enabled, non-service products for POS display.
     * Maps raw API response to the IPosProduct shape.
     */
    async getProducts(): Promise<IPosProduct[]> {
        const response = await apiClient.get<any[]>(API_ROUTES.PRODUCTS.LIST);
        return (response.data || []).map((p: any) => ({
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
            imageUrl: p.imageUrl,
            saleUnitOfMeasure: p.saleUnitOfMeasure,
        }));
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
