import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, PortalUser, LoginRequest, RegisterRequest } from '@/modules/auth';
import { API_ROUTES } from '@/common/api-routes';

interface AuthContextType {
  user: PortalUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = authService.getUser();
    const token = authService.getToken();

    if (savedUser && token) {
      setUser(savedUser);
    }

    setIsLoading(false);
  }, []);

  const login = async (data: LoginRequest) => {
    const response = await authService.login(data);
    setUser(response.user as PortalUser);
  };

  const register = async (data: RegisterRequest) => {
    const response = await authService.register(data);
    setUser(response.user as PortalUser);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    if (!user?.id) return;

    try {
      const token = localStorage.getItem('orderium_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
      const response = await fetch(`${apiBase}${API_ROUTES.PORTAL.ME}`, { headers });
      const data = await response.json();

      if (data.success && data.data) {
        const updatedUser = { ...user, ...data.data };
        setUser(updatedUser);
        localStorage.setItem('orderium_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
