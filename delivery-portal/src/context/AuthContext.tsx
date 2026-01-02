import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { deliveryService } from '../services/api';

interface DeliveryPerson {
  Id: number;
  Name: string;
  PhoneNumber: string;
  Email?: string;
}

interface AuthContextType {
  deliveryPerson: DeliveryPerson | null;
  login: (credentials: { phoneNumber: string; password: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [deliveryPerson, setDeliveryPerson] = useState<DeliveryPerson | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedPerson = localStorage.getItem('deliveryPerson');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedPerson && storedToken) {
      try {
        setDeliveryPerson(JSON.parse(storedPerson));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse stored session:', error);
        localStorage.removeItem('deliveryPerson');
        localStorage.removeItem('authToken');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: { phoneNumber: string; password: string }) => {
    try {
      const response = await fetch('/api/delivery/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PhoneNumber: credentials.phoneNumber,
          Password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      setDeliveryPerson(data.deliveryPerson);
      setIsAuthenticated(true);
      localStorage.setItem('deliveryPerson', JSON.stringify(data.deliveryPerson));
      localStorage.setItem('authToken', data.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setDeliveryPerson(null);
    setIsAuthenticated(false);
    localStorage.removeItem('deliveryPerson');
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ deliveryPerson, login, logout, isAuthenticated, isLoading }}>
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
