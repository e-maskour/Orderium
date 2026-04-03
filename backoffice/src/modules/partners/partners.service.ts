import { PartnersResponse, CreatePartnerDTO, UpdatePartnerDTO } from './partners.interface';
import { Partner } from './partners.model';
import { apiClient, API_ROUTES } from '../../common';

export class PartnersService {
  async getAll(params?: {
    search?: string;
    type?: 'customer' | 'supplier';
  }): Promise<PartnersResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.type) queryParams.type = params.type;
    const response = await apiClient.get<Partner[]>(API_ROUTES.PARTNERS.LIST, {
      params: queryParams,
    });
    const partners = response.data || [];
    return {
      partners: partners.map((p: any) => Partner.fromApiResponse(p)),
      total: (response.metadata as any)?.total || 0,
    };
  }

  async getByPhone(phone: string): Promise<Partner> {
    const response = await apiClient.get<Partner>(API_ROUTES.PARTNERS.BY_PHONE(phone));
    return Partner.fromApiResponse(response.data);
  }

  async getById(id: number): Promise<Partner> {
    const response = await apiClient.get<Partner>(API_ROUTES.PARTNERS.DETAIL(id));
    return Partner.fromApiResponse(response.data);
  }

  async create(data: CreatePartnerDTO): Promise<Partner> {
    const response = await apiClient.post<Partner>(API_ROUTES.PARTNERS.CREATE, data);
    return Partner.fromApiResponse(response.data);
  }

  async update(id: number, data: UpdatePartnerDTO): Promise<Partner> {
    const response = await apiClient.patch<Partner>(API_ROUTES.PARTNERS.UPDATE(id), data);
    return Partner.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.PARTNERS.DELETE(id));
  }

  async getCustomersDashboard(): Promise<any> {
    const response = await apiClient.get<any>(API_ROUTES.PARTNERS.DASHBOARD_CUSTOMERS);
    return response.data;
  }

  async getSuppliersDashboard(): Promise<any> {
    const response = await apiClient.get<any>(API_ROUTES.PARTNERS.DASHBOARD_SUPPLIERS);
    return response.data;
  }

  async getCustomerAnalytics(id: number, year: number): Promise<any> {
    const response = await apiClient.get<any>(API_ROUTES.PARTNERS.CUSTOMER_ANALYTICS(id), {
      params: { year },
    });
    return response.data;
  }

  async getSupplierAnalytics(id: number, year: number): Promise<any> {
    const response = await apiClient.get<any>(API_ROUTES.PARTNERS.SUPPLIER_ANALYTICS(id), {
      params: { year },
    });
    return response.data;
  }

  async getCustomers(params?: { search?: string; limit?: number }): Promise<Partner[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.PARTNERS.LIST, {
      params: { type: 'customer', ...params },
    });
    return (response.data || []).map((p: any) => Partner.fromApiResponse(p));
  }

  async searchCustomers(search: string, limit = 10): Promise<Partner[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.PARTNERS.LIST, {
      params: { search, type: 'customer', limit },
    });
    return (response.data || []).map((p: any) => Partner.fromApiResponse(p));
  }
}

export const partnersService = new PartnersService();
