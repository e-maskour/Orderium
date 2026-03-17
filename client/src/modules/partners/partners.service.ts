import { http } from '@/services/httpClient';
import { PartnerFormData, PartnerSearchResponse, PartnerResponse } from './partners.interface';
import { Partner } from './partners.model';

export class PartnersService {
  async searchByPhone(phone: string): Promise<Partner[]> {
    const response = await http<PartnerSearchResponse>(
      `/api/partners/search?phone=${encodeURIComponent(phone)}`
    );

    if (response.data) {
      return response.data.map((p) => Partner.fromApiResponse(p as Record<string, unknown>));
    }

    return [];
  }

  async getByPhone(phone: string): Promise<Partner> {
    const response = await http<PartnerResponse>(
      `/api/partners/phone/${encodeURIComponent(phone)}`
    );
    return Partner.fromApiResponse(response.data as Record<string, unknown>);
  }

  async upsert(data: PartnerFormData & { portalPhoneNumber?: string }): Promise<Partner> {
    const response = await http<PartnerResponse>(`/api/partners/upsert`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return Partner.fromApiResponse(response.data as Record<string, unknown>);
  }

  async incrementOrderCount(phone: string): Promise<void> {
    await http<void>(
      `/api/partners/${encodeURIComponent(phone)}/increment-order`,
      {
        method: 'POST',
      }
    );
  }
}

export const partnersService = new PartnersService();
