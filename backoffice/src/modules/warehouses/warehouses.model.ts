import { IWarehouse, CreateWarehouseDTO, UpdateWarehouseDTO } from './warehouses.interface';

export class Warehouse implements IWarehouse {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  isActive: boolean;
  dateCreated: string;
  dateUpdated: string;

  constructor(data: IWarehouse) {
    this.id = data.id;
    this.code = data.code;
    this.name = data.name;
    this.address = data.address;
    this.city = data.city;
    this.isActive = data.isActive;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
  }

  get displayName(): string {
    return `${this.code} - ${this.name}`;
  }

  get fullAddress(): string {
    const parts = [this.address, this.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address';
  }

  get statusText(): string {
    return this.isActive ? 'Active' : 'Inactive';
  }

  get hasAddress(): boolean {
    return !!(this.address || this.city);
  }

  static fromApiResponse(data: any): Warehouse {
    return new Warehouse({
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

  toUpdateDTO(): UpdateWarehouseDTO {
    return {
      code: this.code,
      name: this.name,
      address: this.address ?? undefined,
      city: this.city ?? undefined,
      isActive: this.isActive,
    };
  }

  toCreateDTO(): CreateWarehouseDTO {
    return {
      code: this.code,
      name: this.name,
      address: this.address ?? undefined,
      city: this.city ?? undefined,
    };
  }

  toJSON(): IWarehouse {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      address: this.address,
      city: this.city,
      isActive: this.isActive,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };
  }
}
