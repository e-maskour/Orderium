import { http } from './httpClient';

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
  isAdmin?: boolean;
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

export interface AuthResponse {
  success: boolean;
  user: PortalUser;
  token: string;
}

const TOKEN_KEY = 'orderium_token';
const USER_KEY = 'orderium_user';

export const authService = {
  async checkPhoneExists(phoneNumber: string): Promise<{ exists: boolean; customerName?: string; customerId?: number }> {
    try {
      // Check if phone exists in Portal table
      const portalResponse = await http<{ success: boolean; user?: PortalUser }>(`/api/portal/user/${phoneNumber}`);
      if (portalResponse.success && portalResponse.user) {
        return {
          exists: true,
          customerName: portalResponse.user.customerName,
          customerId: portalResponse.user.customerId,
        };
      }
      
      // If not in Portal, check Partner table
      try {
        const partnerResponse = await http<{ partner?: { id: number; name: string; phoneNumber: string } }>(`/api/partners/${phoneNumber}`);
        if (partnerResponse.partner) {
          return {
            exists: false, // Not in Portal, but exists as partner
            customerName: partnerResponse.partner.name,
            customerId: partnerResponse.partner.id,
          };
        }
      } catch {
        // Partner not found either
      }
      
      return { exists: false };
    } catch (error) {
      return { exists: false };
    }
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await http<AuthResponse>('/api/portal/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    // Save token and user to localStorage
    if (response.token) {
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    }
    
    return response;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await http<AuthResponse>('/api/portal/register', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        isCustomer: data.isCustomer ?? true,
      }),
    });
    
    // Save token and user to localStorage
    if (response.token) {
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    }
    
    return response;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): PortalUser | null {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
