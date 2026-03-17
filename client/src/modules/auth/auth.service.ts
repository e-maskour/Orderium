import { http } from '@/services/httpClient';
import { LoginRequest, RegisterRequest, AuthResponse, PhoneCheckResponse } from './auth.interface';
import { PortalUser } from './auth.model';

const TOKEN_KEY = 'orderium_token';
const USER_KEY = 'orderium_user';

export class AuthService {
  async checkPhoneExists(phoneNumber: string): Promise<PhoneCheckResponse> {
    try {
      const response = await http<{
        data: {
          exists: boolean;
          phoneNumber?: string;
          customerId?: number;
          customerName?: string;
          status?: string;
        };
      }>(`/api/portal/user/${phoneNumber}`);

      const d = response.data;
      return {
        exists: d.exists,
        customerName: d.customerName ?? undefined,
        customerId: d.customerId ?? undefined,
        status: d.status ?? undefined,
      };
    } catch {
      return { exists: false };
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const raw = await http<{ data: AuthResponse }>('/api/portal/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    const response = raw.data ?? (raw as unknown as AuthResponse);

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
    const raw = await http<{ data: AuthResponse }>('/api/portal/register', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        isCustomer: data.isCustomer ?? true,
      }),
    });

    const response = raw.data ?? (raw as unknown as AuthResponse);

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
