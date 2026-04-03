import { http } from '@/services/httpClient';
import { PartnerFormData, PartnerSearchResponse, PartnerResponse } from './partners.interface';
import { Partner } from './partners.model';
import { API_ROUTES } from '@/common/api-routes';

export class PartnersService {
  async searchByPhone(phone: string): Promise<Partner[]> {
    const response = await http<PartnerSearchResponse>(
      `${API_ROUTES.PARTNERS.SEARCH}?phone=${encodeURIComponent(phone)}`,
    );

    if (response.data) {
      return response.data.map((p) => Partner.fromApiResponse(p as Record<string, unknown>));
    }

    return [];
  }

  async getByPhone(phone: string): Promise<Partner> {
    const response = await http<PartnerResponse>(API_ROUTES.PARTNERS.BY_PHONE(phone));
    return Partner.fromApiResponse(response.data as Record<string, unknown>);
  }

  async getById(id: number): Promise<Partner> {
    const response = await http<PartnerResponse>(API_ROUTES.PARTNERS.DETAIL(id));
    return Partner.fromApiResponse(response.data as Record<string, unknown>);
  }

  async upsert(data: PartnerFormData & { portalPhoneNumber?: string }): Promise<Partner> {
    const response = await http<PartnerResponse>(API_ROUTES.PARTNERS.UPSERT, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return Partner.fromApiResponse(response.data as Record<string, unknown>);
  }

  async incrementOrderCount(phone: string): Promise<void> {
    await http<void>(API_ROUTES.PARTNERS.INCREMENT_ORDER(phone), {
      method: 'POST',
    });
  }
}

export const partnersService = new PartnersService();
