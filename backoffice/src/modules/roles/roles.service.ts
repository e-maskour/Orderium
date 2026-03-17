import { apiClient } from '../../common/api/api-client';
import { API_ROUTES } from '../../common/api/api-routes';
import type { Role, CreateRolePayload, UpdateRolePayload } from './roles.interface';

class RolesService {
    async getAll(): Promise<Role[]> {
        const res = await apiClient.get<Role[]>(API_ROUTES.ROLES.LIST);
        return (res as any).data ?? res as any;
    }

    async getById(id: number): Promise<Role> {
        const res = await apiClient.get<Role>(API_ROUTES.ROLES.DETAIL(id));
        return (res as any).data ?? res as any;
    }

    async create(payload: CreateRolePayload): Promise<Role> {
        const res = await apiClient.post<Role>(API_ROUTES.ROLES.CREATE, payload);
        return (res as any).data ?? res as any;
    }

    async update(id: number, payload: UpdateRolePayload): Promise<Role> {
        const res = await apiClient.patch<Role>(API_ROUTES.ROLES.UPDATE(id), payload);
        return (res as any).data ?? res as any;
    }

    async remove(id: number): Promise<void> {
        await apiClient.delete(API_ROUTES.ROLES.DELETE(id));
    }

    async seed(): Promise<void> {
        await apiClient.post(API_ROUTES.ROLES.SEED, {});
    }
}

export const rolesService = new RolesService();
