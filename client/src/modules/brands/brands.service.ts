import { http } from '@/services/httpClient';
import { API_ROUTES } from '@/common/api-routes';
import { Brand } from './brands.model';
import { BrandsResponse } from './brands.interface';

export class BrandsService {
  async getAll(): Promise<BrandsResponse> {
    const response = await http<{ data: Record<string, unknown>[] }>(API_ROUTES.PORTAL.BRANDS);
    const brands = Array.isArray(response.data)
      ? response.data.map((b) => Brand.fromApiResponse(b))
      : [];
    return { brands };
  }
}

export const brandsService = new BrandsService();
