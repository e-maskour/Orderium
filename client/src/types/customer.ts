export interface Customer {
  id: number;
  phone: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  wazeUrl?: string;
  totalOrders: number;
  lastOrderAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFormData {
  phone: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  wazeUrl?: string;
}
