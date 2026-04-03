import { apiClient } from '../../common/api/api-client';
import { API_ROUTES } from '../../common/api/api-routes';
import type { Permission } from './permissions.interface';

class PermissionsService {
  async getAll(): Promise<Permission[]> {
    const res = await apiClient.get<Permission[]>(API_ROUTES.PERMISSIONS.LIST);
    return (res as any).data ?? (res as any);
  }

  async seed(): Promise<void> {
    await apiClient.post(API_ROUTES.PERMISSIONS.SEED, {});
  }
}

export const permissionsService = new PermissionsService();
