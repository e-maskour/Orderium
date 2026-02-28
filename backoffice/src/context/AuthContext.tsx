import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiClient, API_ROUTES, setUnauthorizedHandler } from '../common';

interface Admin {
  id: number;
  phoneNumber: string;
  name?: string;
  fullName?: string;
  isCustomer: boolean;
  isDelivery: boolean;
  isAdmin: boolean;
}

const normalizeAdmin = (raw: any): Admin | null => {
  if (!raw) return null;
  const isAdmin = raw.isAdmin ?? raw.IsAdmin;
  const isCustomer = raw.isCustomer ?? raw.IsCustomer ?? false;
  const isDelivery = raw.isDelivery ?? raw.IsDelivery ?? false;

  if (typeof raw.id !== 'number' || !raw.phoneNumber) return null;

  return {
    id: raw.id,
    phoneNumber: raw.phoneNumber,
    name: raw.name ?? raw.FullName,
    fullName: raw.fullName ?? raw.FullName,
    isAdmin: Boolean(isAdmin),
    isCustomer: Boolean(isCustomer),
    isDelivery: Boolean(isDelivery),
  };
};

interface AuthContextType {
  admin: Admin | null;
  login: (credentials: { phoneNumber: string; password: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedAdmin = localStorage.getItem('admin');
    const storedToken = localStorage.getItem('adminToken');
    if (storedAdmin && storedToken) {
      const parsed = normalizeAdmin(JSON.parse(storedAdmin));
      if (parsed?.isAdmin) {
        setAdmin(parsed);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminToken');
      }
    }
    setIsLoading(false);
  }, []);

  // Register the unauthorized handler so apiClient auto-logout triggers React state cleanup
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAdmin(null);
      setIsAuthenticated(false);
      localStorage.removeItem('admin');
      localStorage.removeItem('adminToken');
    });
  }, []);

  const login = async (credentials: { phoneNumber: string; password: string }) => {
    try {
      const data = await apiClient.post<any>(
        API_ROUTES.AUTH.LOGIN,
        { phoneNumber: credentials.phoneNumber, password: credentials.password },
        { skipAuth: true },
      );

      const normalized = normalizeAdmin(data.data?.user);

      // Verify it's an admin account
      if (!normalized?.isAdmin) {
        throw new Error('Access denied: Admin credentials required');
      }

      setAdmin(normalized);
      setIsAuthenticated(true);
      localStorage.setItem('admin', JSON.stringify(normalized));
      localStorage.setItem('adminToken', data.data?.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setAdmin(null);
    setIsAuthenticated(false);
    localStorage.removeItem('admin');
    localStorage.removeItem('adminToken');
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
