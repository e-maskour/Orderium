import { http } from '@/services/httpClient';
import { PartnerFormData, PartnerSearchResponse, PartnerResponse } from './partners.interface';
import { Partner } from './partners.model';

export class PartnersService {
  async searchByPhone(phone: string): Promise<Partner[]> {
    const response = await http<PartnerSearchResponse>(
      `/api/partners/search?phone=${encodeURIComponent(phone)}`
    );
    
    if (response.partners) {
      return response.partners.map((p: any) => Partner.fromApiResponse(p));
    }
    
    return [];
  }

  async getByPhone(phone: string): Promise<Partner> {
    const response = await http<PartnerResponse>(
      `/api/partners/phone/${encodeURIComponent(phone)}`
    );
    return Partner.fromApiResponse(response.partner);
  }

  async upsert(data: PartnerFormData & { portalPhoneNumber?: string }): Promise<Partner> {
    const response = await http<PartnerResponse>(`/api/partners/upsert`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return Partner.fromApiResponse(response.partner);
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
