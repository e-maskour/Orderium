export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface RegisterRequest {
  phoneNumber: string;
  password: string;
  fullName?: string;
  customerId?: number;
  isCustomer?: boolean;
  isDelivery?: boolean;
}

export interface PortalUser {
  id: number;
  phoneNumber: string;
  fullName?: string;
  customerId?: number;
  customerName?: string;
  isCustomer: boolean;
  isDelivery: boolean;
  isAdmin: boolean;
  deliveryId?: number;
}

/** Registration never returns a token — the account awaits admin approval. */
export interface RegisterResponse {
  user: {
    id: number;
    phoneNumber: string;
    name?: string;
    customerId?: number;
    isCustomer: boolean;
    isAdmin: boolean;
    status: 'pending' | 'approved' | 'rejected';
  };
  message?: string;
}

export interface AuthResponse {
  success: boolean;
  user: PortalUser;
  token: string;
}

export interface PhoneCheckResponse {
  exists: boolean;
  id?: number;
  phoneNumber?: string;
  name?: string;
  customerName?: string;
  customerId?: number;
  status?: string;
  address?: string;
  deliveryAddress?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  wazeUrl?: string;
  email?: string;
}
