import { http } from './httpClient';

export interface LoginRequest {
  PhoneNumber: string;
  Password: string;
}

export interface RegisterRequest {
  PhoneNumber: string;
  Password: string;
  CustomerId?: number;
  IsCustomer?: boolean;
  IsDelivery?: boolean;
}

export interface PortalUser {
  Id: number;
  PhoneNumber: string;
  CustomerId?: number;
  CustomerName?: string;
  IsCustomer: boolean;
  IsDelivery: boolean;
  DeliveryId?: number;
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
          customerName: portalResponse.user.CustomerName,
          customerId: portalResponse.user.CustomerId,
        };
      }
      
      // If not in Portal, check Customer table
      try {
        const customerResponse = await http<{ customer?: { Id: number; Name: string; PhoneNumber: string } }>(`/api/customers/${phoneNumber}`);
        if (customerResponse.customer) {
          return {
            exists: false, // Not in Portal, but exists as customer
            customerName: customerResponse.customer.Name,
            customerId: customerResponse.customer.Id,
          };
        }
      } catch {
        // Customer not found either
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
        IsCustomer: data.IsCustomer ?? true,
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
