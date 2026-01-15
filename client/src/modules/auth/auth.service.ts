import { http } from '@/services/httpClient';
import { LoginRequest, RegisterRequest, AuthResponse, PhoneCheckResponse } from './auth.interface';
import { PortalUser } from './auth.model';

const TOKEN_KEY = 'orderium_token';
const USER_KEY = 'orderium_user';

export class AuthService {
  async checkPhoneExists(phoneNumber: string): Promise<PhoneCheckResponse> {
    try {
      // Check if phone exists in Portal table
      const portalResponse = await http<{ success: boolean; user?: any }>(`/api/portal/user/${phoneNumber}`);
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
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await http<AuthResponse>('/api/portal/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    // Transform user to model
    if (response.user) {
      const userModel = PortalUser.fromApiResponse(response.user);
      const enhancedResponse = {
        ...response,
        user: userModel,
      };
      
      // Save token and user to localStorage
      if (response.token) {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(userModel.toJSON()));
      }
      
      return enhancedResponse;
    }
    
    return response;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await http<AuthResponse>('/api/portal/register', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        isCustomer: data.isCustomer ?? true,
      }),
    });
    
    // Transform user to model
    if (response.user) {
      const userModel = PortalUser.fromApiResponse(response.user);
      const enhancedResponse = {
        ...response,
        user: userModel,
      };
      
      // Save token and user to localStorage
      if (response.token) {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(userModel.toJSON()));
      }
      
      return enhancedResponse;
    }
    
    return response;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUser(): PortalUser | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    
    try {
      const userData = JSON.parse(userStr);
      return PortalUser.fromApiResponse(userData);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
