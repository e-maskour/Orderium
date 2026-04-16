import { Order, OrderWithDetails } from './orders.model';
import { apiClient, API_ROUTES } from '../../common';

export class OrdersService {
  async create(orderData: any): Promise<Order> {
    const response = await apiClient.post<any>(API_ROUTES.ORDERS.CREATE, orderData);
    return Order.fromApiResponse(response.data);
  }

  async getAll(
    search?: string,
    startDate?: Date,
    endDate?: Date,
    originType?: string | string[],
    deliveryStatus?: string[],
    orderNumber?: string,
    page: number = 1,
    perPage: number = 50,
    direction?: 'ACHAT' | 'VENTE',
    status?: string[],
  ): Promise<any> {
    const filters: any = {};
    let remainingSearch = search || '';
    if (search) {
      search.split(' ').forEach((part) => {
        if (part.startsWith('customerId:')) {
          filters.customerId = parseInt(part.split(':')[1]);
          remainingSearch = remainingSearch.replace(part, '').trim();
        } else if (part.startsWith('deliveryPersonId:')) {
          filters.deliveryPersonId = parseInt(part.split(':')[1]);
          remainingSearch = remainingSearch.replace(part, '').trim();
        }
      });
    }

    const queryParams: Record<string, string | number | boolean | undefined> = { page, perPage };
    if (direction) queryParams.direction = direction;

    const body: any = {};
    if (remainingSearch) body.search = remainingSearch;
    if (startDate) body.startDate = startDate.toISOString();
    if (endDate) body.endDate = endDate.toISOString();
    if (deliveryStatus) body.deliveryStatus = deliveryStatus;
    if (status) body.status = status;
    if (orderNumber) body.orderNumber = orderNumber;
    if (filters.customerId) body.customerId = filters.customerId;
    if (filters.deliveryPersonId) body.deliveryPersonId = filters.deliveryPersonId;
    if (originType !== undefined) body.originType = originType;

    const response = await apiClient.post<any[]>(API_ROUTES.ORDERS.FILTER, body, {
      params: queryParams,
    });

    const orders = response.data || [];
    if (Array.isArray(orders)) {
      return {
        orders: orders.map((o: any) => Order.fromApiResponse(o)),
        count: (response.metadata as any)?.total || orders.length,
        totalCount: (response.metadata as any)?.total || orders.length,
        statusCounts: (response.metadata as any)?.statusCounts || {},
        orderStatusCounts: (response.metadata as any)?.orderStatusCounts || {},
      };
    }
    return { orders: [], count: 0, totalCount: 0, statusCounts: {}, orderStatusCounts: {} };
  }

  async getAggregates(
    search?: string,
    startDate?: Date,
    endDate?: Date,
    originType?: string | string[],
    deliveryStatus?: string[],
    orderNumber?: string,
    direction?: 'ACHAT' | 'VENTE',
    status?: string[],
  ): Promise<{
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
    totalSubtotal: number;
  }> {
    const filters: any = {};
    let remainingSearch = search || '';
    if (search) {
      search.split(' ').forEach((part) => {
        if (part.startsWith('customerId:')) {
          filters.customerId = parseInt(part.split(':')[1]);
          remainingSearch = remainingSearch.replace(part, '').trim();
        } else if (part.startsWith('deliveryPersonId:')) {
          filters.deliveryPersonId = parseInt(part.split(':')[1]);
          remainingSearch = remainingSearch.replace(part, '').trim();
        }
      });
    }

    const queryParams: Record<string, string | number | boolean | undefined> = {};
    if (direction) queryParams.direction = direction;

    const body: any = {};
    if (remainingSearch) body.search = remainingSearch;
    if (startDate) body.startDate = startDate.toISOString();
    if (endDate) body.endDate = endDate.toISOString();
    if (deliveryStatus) body.deliveryStatus = deliveryStatus;
    if (status) body.status = status;
    if (orderNumber) body.orderNumber = orderNumber;
    if (filters.customerId) body.customerId = filters.customerId;
    if (filters.deliveryPersonId) body.deliveryPersonId = filters.deliveryPersonId;
    if (originType !== undefined) body.originType = originType;

    const response = await apiClient.post<any>(API_ROUTES.ORDERS.FILTER_AGGREGATES, body, {
      params: queryParams,
    });
    return (
      (response.data as any) || {
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalSubtotal: 0,
      }
    );
  }

  async getById(orderId: number): Promise<OrderWithDetails> {
    const response = await apiClient.get<any>(API_ROUTES.ORDERS.DETAIL(orderId));
    return OrderWithDetails.fromApiResponse(response.data);
  }

  async update(orderId: number, orderData: any): Promise<Order> {
    const response = await apiClient.patch<any>(API_ROUTES.ORDERS.UPDATE(orderId), orderData);
    return Order.fromApiResponse(response.data);
  }

  async updateValidated(orderId: number, orderData: any): Promise<Order> {
    const response = await apiClient.patch<any>(
      API_ROUTES.ORDERS.UPDATE_VALIDATED(orderId),
      orderData,
    );
    return Order.fromApiResponse(response.data);
  }

  async assignToDelivery(orderId: number, deliveryPersonId: number): Promise<void> {
    await apiClient.post(API_ROUTES.DELIVERY.ASSIGN, {
      OrderId: orderId,
      DeliveryPersonId: deliveryPersonId,
    });
  }

  async unassignOrder(orderId: number): Promise<void> {
    await apiClient.post(API_ROUTES.DELIVERY.UNASSIGN(orderId));
  }

  async validate(orderId: number): Promise<Order> {
    const response = await apiClient.put<any>(API_ROUTES.ORDERS.VALIDATE(orderId));
    return Order.fromApiResponse(response.data);
  }

  async devalidate(orderId: number): Promise<Order> {
    const response = await apiClient.put<any>(API_ROUTES.ORDERS.DEVALIDATE(orderId));
    return Order.fromApiResponse(response.data);
  }

  async deliver(orderId: number): Promise<Order> {
    const response = await apiClient.put<any>(API_ROUTES.ORDERS.DELIVER(orderId));
    return Order.fromApiResponse(response.data);
  }

  async cancel(orderId: number): Promise<Order> {
    const response = await apiClient.put<any>(API_ROUTES.ORDERS.CANCEL(orderId));
    return Order.fromApiResponse(response.data);
  }

  async changeStatus(orderId: number, status: string): Promise<Order> {
    const response = await apiClient.patch<any>(API_ROUTES.ORDERS.CHANGE_STATUS(orderId), {
      status,
    });
    return Order.fromApiResponse(response.data);
  }

  async markAsInvoiced(orderId: number, invoiceId: number): Promise<Order> {
    const response = await apiClient.put<any>(API_ROUTES.ORDERS.MARK_INVOICED(orderId), {
      invoiceId,
    });
    return Order.fromApiResponse(response.data);
  }

  async delete(orderId: number): Promise<void> {
    await apiClient.delete(API_ROUTES.ORDERS.DELETE(orderId));
  }

  async bulkDelete(ids: number[]): Promise<void> {
    await apiClient.delete(API_ROUTES.ORDERS.BULK_DELETE, { ids });
  }

  async getOrderNumbers(search?: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.ORDERS.SEARCH_ORDER_NUMBERS, {
      params: { ...(search ? { search } : {}), limit: 50 },
    });
    return response.data || [];
  }

  async getAnalytics(direction: 'vente' | 'achat', year: number): Promise<any> {
    const response = await apiClient.get<any>(API_ROUTES.ORDERS.ANALYTICS(direction), {
      params: { year },
    });
    return response.data;
  }

  async exportToXlsx(supplierId?: number): Promise<Blob> {
    const raw = await apiClient.raw('GET', API_ROUTES.ORDERS.EXPORT_XLSX, {
      params: supplierId !== undefined ? { supplierId } : undefined,
    });
    return raw.blob();
  }

  async generateShareLink(id: number): Promise<{ shareToken: string; expiresAt: Date }> {
    const result = await apiClient.post<any>(API_ROUTES.ORDERS.SHARE(id));
    return {
      shareToken: result.data.shareToken,
      expiresAt: new Date(result.data.expiresAt),
    };
  }

  async getByShareToken(token: string): Promise<any> {
    const response = await apiClient.get<any>(API_ROUTES.ORDERS.SHARED(token));
    return response.data;
  }

  async revokeShareLink(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.ORDERS.SHARE(id));
  }
}

export const ordersService = new OrdersService();
