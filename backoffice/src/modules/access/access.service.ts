import { apiClient } from '../../common/api/api-client';
import { API_ROUTES } from '../../common/api/api-routes';
import type { AccessRegistry, EffectiveAccess } from './access.interface';

class AccessService {
  /** The module/action/level registry that drives the role matrix. */
  async getRegistry(): Promise<AccessRegistry> {
    const res = await apiClient.get<AccessRegistry>(API_ROUTES.ACCESS.MODULES);
    return (res as any).data ?? (res as any);
  }

  /**
   * The caller's effective permissions.
   *
   * Resolved server-side on every call rather than read out of the JWT, which
   * is what makes a role edit visible without signing out again.
   */
  async getMyAccess(): Promise<EffectiveAccess> {
    const res = await apiClient.get<EffectiveAccess>(API_ROUTES.ACCESS.ME);
    return (res as any).data ?? (res as any);
  }

  /** Re-sync the permission catalogue and preset roles from the registry. */
  async sync(): Promise<void> {
    await apiClient.post(API_ROUTES.ACCESS.SYNC, {});
  }
}

export const accessService = new AccessService();
