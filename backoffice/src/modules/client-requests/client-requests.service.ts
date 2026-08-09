import { apiClient } from '../../common/api/api-client';
import { API_ROUTES } from '../../common/api/api-routes';
import type {
  ClientRequest,
  ClientRequestsParams,
  ClientRequestsResponse,
  ClientRequestStatus,
} from './client-requests.interface';

class ClientRequestsService {
  async getAll(params: ClientRequestsParams = {}): Promise<ClientRequestsResponse> {
    const query = new URLSearchParams();
    query.set('userType', 'client');
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    const res = await apiClient.get<{ data: ClientRequest[]; total: number }>(
      `${API_ROUTES.CLIENT_REQUESTS.LIST}?${query.toString()}`,
    );
    const payload = res.data;
    return {
      requests: Array.isArray(payload?.data) ? payload.data : [],
      total: payload?.total ?? 0,
    };
  }

  /** Number of accounts still awaiting a decision — drives the sidebar badge. */
  async getPendingCount(): Promise<number> {
    const { total } = await this.getAll({ status: 'pending', page: 1, pageSize: 1 });
    return total;
  }

  async approve(id: number): Promise<void> {
    await apiClient.patch(API_ROUTES.CLIENT_REQUESTS.APPROVE(id), {});
  }

  async reject(id: number): Promise<void> {
    await apiClient.patch(API_ROUTES.CLIENT_REQUESTS.REJECT(id), {});
  }

  /** Applies a decision to several requests; rejects if any single call fails. */
  async decideMany(
    ids: number[],
    decision: Exclude<ClientRequestStatus, 'pending'>,
  ): Promise<void> {
    await Promise.all(
      ids.map((id) => (decision === 'approved' ? this.approve(id) : this.reject(id))),
    );
  }
}

export const clientRequestsService = new ClientRequestsService();
