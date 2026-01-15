export interface Customer {
  id: number;
  code: string;
  name: string;
  taxNumber?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  countryId?: number | null;
  email?: string | null;
  phoneNumber: string;
  isEnabled: boolean;
  isCustomer: boolean;
  isSupplier: boolean;
  dueDatePeriod?: number | null;
  dateCreated: string;
  dateUpdated: string;
  streetName?: string | null;
  additionalStreetName?: string | null;
  buildingNumber?: string | null;
  plotIdentification?: string | null;
  citySubdivisionName?: string | null;
  countrySubentity?: string | null;
  isTaxExempt: boolean;
  priceListId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  wazeUrl?: string | null;
  totalOrders?: number;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
}

export interface CreateCustomerDTO {
  name: string;
  phoneNumber: string;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  city?: string | null;
  postalCode?: string | null;
}

export interface UpdateCustomerDTO {
  name?: string;
  phoneNumber?: string;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  city?: string | null;
  postalCode?: string | null;
  isEnabled?: boolean;
}
