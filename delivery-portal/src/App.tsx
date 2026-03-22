import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrimeReactProvider } from 'primereact/api';
import deliveryPortalConfig from './theme-preset';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster, ConfirmProvider } from '@orderium/ui';
import { PushNotificationProvider } from './components/PushNotificationProvider';
import Login from './pages/Login';
import Orders from './pages/Orders';
import ActiveOrders from './pages/ActiveOrders';
import DeliveredOrders from './pages/DeliveredOrders';
import Profile from './pages/Profile';
import OrderDetail from './pages/OrderDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      refetchInterval: 30000,
      refetchIntervalInBackground: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function App() {
  return (
    <PrimeReactProvider value={deliveryPortalConfig}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <PushNotificationProvider />
            <ConfirmProvider>
              <Toaster position="top-right" />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <Orders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders/:orderId"
                    element={
                      <ProtectedRoute>
                        <OrderDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/active"
                    element={
                      <ProtectedRoute>
                        <ActiveOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/delivered"
                    element={
                      <ProtectedRoute>
                        <DeliveredOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/" element={<Navigate to="/orders" replace />} />
                </Routes>
              </BrowserRouter>
            </ConfirmProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </PrimeReactProvider>
  );
}

export default App;
