import {
  CreateOrderPaymentDTO,
  UpdateOrderPaymentDTO,
  ICaisseOrder,
  CaisseFilters,
  CaissePage,
} from './order-payments.interface';
import { OrderPayment } from './order-payments.model';
import { apiClient, API_ROUTES } from '../../common';

export class OrderPaymentsService {
  async getCaisseSummary(signal?: AbortSignal): Promise<ICaisseOrder[]> {
    const response = await apiClient.get<ICaisseOrder[]>(API_ROUTES.ORDER_PAYMENTS.CAISSE, {
      signal,
    });
    return response.data || [];
  }

  /**
   * Server-filtered, paginated caisse list. `counts` (tab badges) and
   * `summary` (totals) describe the whole filtered set, not just the page.
   */
  async getCaissePage(filters: CaisseFilters, signal?: AbortSignal): Promise<CaissePage> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.status && filters.status !== 'all') params.status = filters.status;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.sortField) {
      params.sortField = filters.sortField;
      params.sortOrder = filters.sortOrder ?? 'ASC';
    }

    const response = await apiClient.get<ICaisseOrder[]>(API_ROUTES.ORDER_PAYMENTS.CAISSE, {
      params,
      signal,
    });
    const orders = response.data || [];
    const meta = (response.metadata ?? {}) as Partial<
      Pick<CaissePage, 'total' | 'counts' | 'summary'>
    >;
    return {
      orders,
      total: meta.total ?? orders.length,
      counts: meta.counts ?? { all: orders.length, paid: 0, partial: 0, unpaid: 0 },
      summary: meta.summary ?? { totalDue: 0, totalCollected: 0, totalRemaining: 0 },
    };
  }

  async getAll(): Promise<OrderPayment[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.ORDER_PAYMENTS.LIST_ALL);
    return (response.data || []).map((p: any) => OrderPayment.fromApiResponse(p));
  }

  async getByOrder(orderId: number): Promise<OrderPayment[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.ORDER_PAYMENTS.BY_ORDER(orderId));
    return (response.data || []).map((p: any) => OrderPayment.fromApiResponse(p));
  }

  async getTotalPaid(orderId: number): Promise<number> {
    const response = await apiClient.get<number>(API_ROUTES.ORDER_PAYMENTS.ORDER_TOTAL(orderId));
    return response.data ?? 0;
  }

  async getById(id: number): Promise<OrderPayment> {
    const response = await apiClient.get<any>(API_ROUTES.ORDER_PAYMENTS.DETAIL(id));
    return OrderPayment.fromApiResponse(response.data);
  }

  async create(data: CreateOrderPaymentDTO): Promise<OrderPayment> {
    const response = await apiClient.post<any>(API_ROUTES.ORDER_PAYMENTS.CREATE, data);
    return OrderPayment.fromApiResponse(response.data);
  }

  async update(id: number, data: UpdateOrderPaymentDTO): Promise<OrderPayment> {
    const response = await apiClient.patch<any>(API_ROUTES.ORDER_PAYMENTS.UPDATE(id), data);
    return OrderPayment.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.ORDER_PAYMENTS.DELETE(id));
  }
}

export const orderPaymentsService = new OrderPaymentsService();
