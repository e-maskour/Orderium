export interface Partner {
  id: number;
  code?: string;
  name: string;
  taxNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  countryId?: number;
  email?: string;
  phoneNumber?: string;
  isEnabled: boolean;
  isCustomer: boolean;
  isSupplier: boolean;
  dueDatePeriod: number;
  dateCreated: string;
  dateUpdated: string;
  streetName?: string;
  additionalStreetName?: string;
  buildingNumber?: string;
  plotIdentification?: string;
  citySubdivisionName?: string;
  countrySubentity?: string;
  isTaxExempt: boolean;
  priceListId?: number;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  wazeUrl?: string;
  totalOrders?: number;
}

export interface PartnerFormData {
  phoneNumber: string;
  name: string;
  email?: string;
  address?: string;
  deliveryAddress?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  wazeUrl?: string;
}

export interface PartnerSearchResponse {
  data: Partner[];
}

export interface PartnerResponse {
  data: Partner;
}
