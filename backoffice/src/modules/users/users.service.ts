import { apiClient } from '../../common/api/api-client';
import { API_ROUTES } from '../../common/api/api-routes';
import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  UserType,
  UserStatus,
} from './users.interface';

interface ListParams {
  page?: number;
  perPage?: number;
  search?: string;
  userType?: UserType;
  status?: UserStatus;
}

class UsersService {
  async getAll(params: ListParams = {}): Promise<{ users: User[]; total: number }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.perPage) query.set('perPage', String(params.perPage));
    if (params.search) query.set('search', params.search);
    if (params.userType) query.set('userType', params.userType);
    if (params.status) query.set('status', params.status);

    const qs = query.toString();
    const url = qs ? `${API_ROUTES.USERS.LIST}?${qs}` : API_ROUTES.USERS.LIST;
    const res = await apiClient.get<User[]>(url);
    const data = (res as any).data ?? res;
    const metadata = (res as any).metadata;
    return {
      users: Array.isArray(data) ? data : [],
      total: metadata?.total ?? (Array.isArray(data) ? data.length : 0),
    };
  }

  async getById(id: number): Promise<User> {
    const res = await apiClient.get<User>(API_ROUTES.USERS.DETAIL(id));
    return (res as any).data ?? (res as any);
  }

  async create(payload: CreateUserPayload): Promise<User> {
    const res = await apiClient.post<User>(API_ROUTES.USERS.CREATE, payload);
    return (res as any).data ?? (res as any);
  }

  async update(id: number, payload: UpdateUserPayload): Promise<User> {
    const res = await apiClient.patch<User>(API_ROUTES.USERS.UPDATE(id), payload);
    return (res as any).data ?? (res as any);
  }

  async activate(id: number): Promise<User> {
    const res = await apiClient.patch<User>(API_ROUTES.USERS.ACTIVATE(id), {});
    return (res as any).data ?? (res as any);
  }

  async deactivate(id: number): Promise<User> {
    const res = await apiClient.patch<User>(API_ROUTES.USERS.DEACTIVATE(id), {});
    return (res as any).data ?? (res as any);
  }

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.USERS.DELETE(id));
  }

  async approve(id: number): Promise<void> {
    await apiClient.patch(API_ROUTES.USERS.APPROVE(id), {});
  }

  async reject(id: number): Promise<void> {
    await apiClient.patch(API_ROUTES.USERS.REJECT(id), {});
  }
}

export const usersService = new UsersService();
