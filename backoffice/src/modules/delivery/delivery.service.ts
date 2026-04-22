import { CreateDeliveryPersonDTO, UpdateDeliveryPersonDTO } from './delivery.interface';
import { DeliveryPerson } from './delivery.model';
import { apiClient, API_ROUTES } from '../../common';

export class DeliveryPersonService {
  async getAll(search?: string, isActive?: boolean): Promise<DeliveryPerson[]> {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (isActive !== undefined) params.isActive = String(isActive);
    const response = await apiClient.get<any[]>(API_ROUTES.DELIVERY.LIST_PERSONS, { params });
    return (response.data || []).map((d: any) => DeliveryPerson.fromApiResponse(d));
  }

  async getById(id: number): Promise<DeliveryPerson> {
    const response = await apiClient.get<any>(API_ROUTES.DELIVERY.PERSON_DETAIL(id));
    return DeliveryPerson.fromApiResponse(response.data);
  }

  async create(data: CreateDeliveryPersonDTO): Promise<DeliveryPerson> {
    const response = await apiClient.post<any>(API_ROUTES.DELIVERY.CREATE, data);
    return DeliveryPerson.fromApiResponse(response.data);
  }

  async update(id: number, data: UpdateDeliveryPersonDTO): Promise<DeliveryPerson> {
    const response = await apiClient.patch<any>(API_ROUTES.DELIVERY.UPDATE(id), data);
    return DeliveryPerson.fromApiResponse(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.DELIVERY.DELETE(id));
  }
}

export const deliveryPersonService = new DeliveryPersonService();
