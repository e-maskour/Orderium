export interface Partner {
  id: number;
  name: string;
  phoneNumber: string;
  email?: string | null;
  address?: string | null;
  ice?: string | null;
  if?: string | null;
  cnss?: string | null;
  rc?: string | null;
  patente?: string | null;
  tvaNumber?: string | null;
  deliveryAddress?: string | null;
  isCompany: boolean;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  wazeUrl?: string | null;
  isEnabled: boolean;
  isCustomer: boolean;
  isSupplier: boolean;
  dateCreated: string;
  dateUpdated: string;
}

export interface PartnersResponse {
  partners: Partner[];
  total: number;
}

export interface CreatePartnerDTO {
  name: string;
  phoneNumber: string;
  email?: string | null;
  address?: string | null;
  ice?: string | null;
  if?: string | null;
  cnss?: string | null;
  rc?: string | null;
  patente?: string | null;
  tvaNumber?: string | null;
  deliveryAddress?: string | null;
  isCompany?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  wazeUrl?: string | null;
  isEnabled?: boolean;
  isCustomer?: boolean;
  isSupplier?: boolean;
}

export interface UpdatePartnerDTO {
  name?: string;
  phoneNumber?: string;
  email?: string | null;
  address?: string | null;
  ice?: string | null;
  if?: string | null;
  cnss?: string | null;
  rc?: string | null;
  patente?: string | null;
  tvaNumber?: string | null;
  deliveryAddress?: string | null;
  isCompany?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  wazeUrl?: string | null;
  isEnabled?: boolean;
  isCustomer?: boolean;
  isSupplier?: boolean;
}
