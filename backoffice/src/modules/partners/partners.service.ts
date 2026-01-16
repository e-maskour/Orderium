import { PartnersResponse, CreatePartnerDTO, UpdatePartnerDTO } from './partners.interface';
import { Partner } from './partners.model';

const API_URL = '/api';

export class PartnersService {
  async getAll(): Promise<PartnersResponse> {
    const response = await fetch(`${API_URL}/partners`);
    if (!response.ok) throw new Error('Failed to fetch partners');
    const data = await response.json();
    const partners = data.partners || [];
    return { 
      partners: partners.map((p: any) => Partner.fromApiResponse(p)),
      total: data.total || 0 
    };
  }

  async getByPhone(phone: string): Promise<Partner> {
    const response = await fetch(`${API_URL}/partners/${encodeURIComponent(phone)}`);
    if (!response.ok) throw new Error('Failed to fetch partner');
    const data = await response.json();
    return Partner.fromApiResponse(data.partner);
  }

  async create(data: CreatePartnerDTO): Promise<Partner> {
    const response = await fetch(`${API_URL}/partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create partner');
    }
    const result = await response.json();
    return Partner.fromApiResponse(result.partner);
  }

  async update(id: number, data: UpdatePartnerDTO): Promise<Partner> {
    const response = await fetch(`${API_URL}/partners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update partner');
    }
    const result = await response.json();
    return Partner.fromApiResponse(result.partner);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/partners/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete partner');
  }
}

export const partnersService = new PartnersService();