import { http } from '@/services/httpClient';
import { LoginRequest, RegisterRequest, AuthResponse, PhoneCheckResponse } from './auth.interface';
import { PortalUser } from './auth.model';
import { API_ROUTES } from '@/common/api-routes';

const TOKEN_KEY = 'orderium_token';
const USER_KEY = 'orderium_user';

export class AuthService {
  async checkPhoneExists(phoneNumber: string): Promise<PhoneCheckResponse> {
    try {
      const response = await http<{
        data: {
          exists: boolean;
          id?: number;
          phoneNumber?: string;
          name?: string;
          customerId?: number;
          customerName?: string;
          status?: string;
          address?: string;
          deliveryAddress?: string;
          latitude?: number;
          longitude?: number;
          googleMapsUrl?: string;
          wazeUrl?: string;
          email?: string;
        };
      }>(API_ROUTES.PORTAL.USER_BY_PHONE(phoneNumber));

      const d = response.data;
      return {
        exists: d.exists,
        id: d.id ?? undefined,
        phoneNumber: d.phoneNumber ?? undefined,
        name: d.name ?? d.customerName ?? undefined,
        customerName: d.customerName ?? undefined,
        customerId: d.customerId ?? undefined,
        status: d.status ?? undefined,
        address: d.address ?? undefined,
        deliveryAddress: d.deliveryAddress ?? undefined,
        latitude: d.latitude ?? undefined,
        longitude: d.longitude ?? undefined,
        googleMapsUrl: d.googleMapsUrl ?? undefined,
        wazeUrl: d.wazeUrl ?? undefined,
        email: d.email ?? undefined,
      };
    } catch {
      return { exists: false };
    }
  }

  async getPortalUserById(id: number): Promise<PhoneCheckResponse> {
    try {
      const response = await http<{
        data: {
          exists: boolean;
          id?: number;
          phoneNumber?: string;
          name?: string;
          customerId?: number;
          customerName?: string;
          status?: string;
          address?: string;
          deliveryAddress?: string;
          latitude?: number;
          longitude?: number;
          googleMapsUrl?: string;
          wazeUrl?: string;
          email?: string;
        };
      }>(API_ROUTES.PORTAL.USER_BY_ID(id));

      const d = response.data;
      return {
        exists: d.exists,
        id: d.id ?? undefined,
        phoneNumber: d.phoneNumber ?? undefined,
        name: d.name ?? d.customerName ?? undefined,
        customerName: d.customerName ?? undefined,
        customerId: d.customerId ?? undefined,
        status: d.status ?? undefined,
        address: d.address ?? undefined,
        deliveryAddress: d.deliveryAddress ?? undefined,
        latitude: d.latitude ?? undefined,
        longitude: d.longitude ?? undefined,
        googleMapsUrl: d.googleMapsUrl ?? undefined,
        wazeUrl: d.wazeUrl ?? undefined,
        email: d.email ?? undefined,
      };
    } catch {
      return { exists: false };
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const raw = await http<{ data: AuthResponse }>(API_ROUTES.PORTAL.LOGIN, {
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
    const raw = await http<{ data: AuthResponse }>(API_ROUTES.PORTAL.REGISTER, {
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
