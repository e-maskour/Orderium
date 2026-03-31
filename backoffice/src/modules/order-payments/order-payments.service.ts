import {
    CreateOrderPaymentDTO,
    UpdateOrderPaymentDTO,
    ICaisseOrder,
} from './order-payments.interface';
import { OrderPayment } from './order-payments.model';
import { apiClient, API_ROUTES } from '../../common';

export class OrderPaymentsService {
    async getCaisseSummary(): Promise<ICaisseOrder[]> {
        const response = await apiClient.get<ICaisseOrder[]>(
            API_ROUTES.ORDER_PAYMENTS.CAISSE,
        );
        return response.data || [];
    }

    async getAll(): Promise<OrderPayment[]> {
        const response = await apiClient.get<any[]>(
            API_ROUTES.ORDER_PAYMENTS.LIST_ALL,
        );
        return (response.data || []).map((p: any) => OrderPayment.fromApiResponse(p));
    }

    async getByOrder(orderId: number): Promise<OrderPayment[]> {
        const response = await apiClient.get<any[]>(
            API_ROUTES.ORDER_PAYMENTS.BY_ORDER(orderId),
        );
        return (response.data || []).map((p: any) => OrderPayment.fromApiResponse(p));
    }

    async getTotalPaid(orderId: number): Promise<number> {
        const response = await apiClient.get<number>(
            API_ROUTES.ORDER_PAYMENTS.ORDER_TOTAL(orderId),
        );
        return response.data ?? 0;
    }

    async getById(id: number): Promise<OrderPayment> {
        const response = await apiClient.get<any>(
            API_ROUTES.ORDER_PAYMENTS.DETAIL(id),
        );
        return OrderPayment.fromApiResponse(response.data);
    }

    async create(data: CreateOrderPaymentDTO): Promise<OrderPayment> {
        const response = await apiClient.post<any>(
            API_ROUTES.ORDER_PAYMENTS.CREATE,
            data,
        );
        return OrderPayment.fromApiResponse(response.data);
    }

    async update(id: number, data: UpdateOrderPaymentDTO): Promise<OrderPayment> {
        const response = await apiClient.patch<any>(
            API_ROUTES.ORDER_PAYMENTS.UPDATE(id),
            data,
        );
        return OrderPayment.fromApiResponse(response.data);
    }

    async delete(id: number): Promise<void> {
        await apiClient.delete(API_ROUTES.ORDER_PAYMENTS.DELETE(id));
    }
}

export const orderPaymentsService = new OrderPaymentsService();
