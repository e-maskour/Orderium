import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface Admin {
  Id: number;
  PhoneNumber: string;
  IsCustomer: boolean;
  IsDelivery: boolean;
}

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
      setAdmin(JSON.parse(storedAdmin));
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: { phoneNumber: string; password: string }) => {
    try {
      const response = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PhoneNumber: credentials.phoneNumber,
          Password: credentials.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      // Verify it's an admin account (not customer or delivery)
      if (data.user.IsCustomer || data.user.IsDelivery) {
        throw new Error('Access denied: Admin credentials required');
      }
      
      setAdmin(data.user);
      setIsAuthenticated(true);
      localStorage.setItem('admin', JSON.stringify(data.user));
      localStorage.setItem('adminToken', data.token);
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
