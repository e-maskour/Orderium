import { Warehouse } from './warehouses.interface';

export class WarehouseModel implements Warehouse {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  isActive: boolean;
  dateCreated: string;
  dateUpdated: string;

  constructor(data: Warehouse) {
    this.id = data.id;
    this.code = data.code;
    this.name = data.name;
    this.address = data.address;
    this.city = data.city;
    this.isActive = data.isActive;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
  }

  static fromApiResponse(data: any): WarehouseModel {
    return new WarehouseModel({
      id: data.id,
      code: data.code,
      name: data.name,
      address: data.address || null,
      city: data.city || null,
      isActive: data.isActive ?? true,
      dateCreated: data.dateCreated || new Date().toISOString(),
      dateUpdated: data.dateUpdated || new Date().toISOString(),
    });
  }
}
