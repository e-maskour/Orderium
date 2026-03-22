import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface DeliveryPerson {
  id: number;
  name: string;
  phoneNumber: string;
  email?: string;
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
        const parsed = JSON.parse(storedPerson);
        // Normalise legacy PascalCase keys to camelCase
        const normalised: DeliveryPerson = {
          id: parsed.id ?? parsed.Id,
          name: parsed.name ?? parsed.Name,
          phoneNumber: parsed.phoneNumber ?? parsed.PhoneNumber,
          email: parsed.email ?? parsed.Email,
        };
        if (!normalised.id) throw new Error('Missing delivery person id');
        setDeliveryPerson(normalised);
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

    const responseBody = await response.json();
    const data = responseBody.data;

    const dp = data.deliveryPerson;
    const deliveryPersonData = {
      id: dp.id ?? dp.Id,
      name: dp.name ?? dp.Name,
      phoneNumber: dp.phoneNumber ?? dp.PhoneNumber,
      email: dp.email ?? dp.Email,
    };

    setDeliveryPerson(deliveryPersonData);
    setIsAuthenticated(true);
    localStorage.setItem('deliveryPerson', JSON.stringify(deliveryPersonData));
    localStorage.setItem('authToken', data.token);
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
