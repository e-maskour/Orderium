export interface IWarehouse {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  isActive: boolean;
  dateCreated: string;
  dateUpdated: string;
}

export interface WarehousesResponse {
  warehouses: IWarehouse[];
}

export interface CreateWarehouseDTO {
  code: string;
  name: string;
  address?: string;
  city?: string;
}

export interface UpdateWarehouseDTO {
  code?: string;
  name?: string;
  address?: string;
  city?: string;
  isActive?: boolean;
}
