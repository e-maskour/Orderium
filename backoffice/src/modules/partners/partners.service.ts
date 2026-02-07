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

  async getById(id: number): Promise<Partner> {
    const response = await fetch(`${API_URL}/partners/${id}`);
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
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete partner');
    }
  }

  async getCustomersDashboard(): Promise<any> {
    const response = await fetch(`${API_URL}/partners/dashboard/customers`);
    if (!response.ok) throw new Error('Failed to fetch customers dashboard');
    const data = await response.json();
    return data.data;
  }

  async getSuppliersDashboard(): Promise<any> {
    const response = await fetch(`${API_URL}/partners/dashboard/suppliers`);
    if (!response.ok) throw new Error('Failed to fetch suppliers dashboard');
    const data = await response.json();
    return data.data;
  }

  async getCustomerAnalytics(id: number, year: number): Promise<any> {
    const response = await fetch(`${API_URL}/partners/${id}/customer-analytics?year=${year}`);
    if (!response.ok) throw new Error('Failed to fetch customer analytics');
    const data = await response.json();
    return data.data;
  }

  async getSupplierAnalytics(id: number, year: number): Promise<any> {
    const response = await fetch(`${API_URL}/partners/${id}/supplier-analytics?year=${year}`);
    if (!response.ok) throw new Error('Failed to fetch supplier analytics');
    const data = await response.json();
    return data.data;
  }
}

export const partnersService = new PartnersService();