export interface Portal {
  Id: number;
  PhoneNumber: string;
  Password: string; // Hashed
  FullName?: string;
  CustomerId?: number;
  IsCustomer: boolean;
  IsDelivery: boolean;
  IsAdmin: boolean;
  DeliveryId?: number;
  DateCreated: Date;
  DateUpdated: Date;
}

export interface CreatePortalDTO {
  PhoneNumber: string;
  Password: string; // Plain text - will be hashed
  FullName?: string;
  CustomerId?: number;
  IsCustomer?: boolean;
  IsDelivery?: boolean;
  IsAdmin?: boolean;
  DeliveryId?: number;
}

export interface LoginDTO {
  PhoneNumber: string;
  Password: string; // Plain text
}

export interface PortalWithCustomer {
  Id: number;
  PhoneNumber: string;
  FullName?: string;
  CustomerId?: number;
  CustomerName?: string;
  IsCustomer: boolean;
  IsDelivery: boolean;
  IsAdmin: boolean;
  DeliveryId?: number;
}
