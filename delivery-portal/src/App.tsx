import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrimeReactProvider } from 'primereact/api';
import deliveryPortalConfig from './theme-preset';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TenantStatusGuard } from './components/TenantStatusGuard';
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
      gcTime: 5 * 60 * 1000,
      retry: 2,
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
              <Toaster position="bottom-right" />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <TenantStatusGuard>
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
                </TenantStatusGuard>
              </BrowserRouter>
            </ConfirmProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </PrimeReactProvider>
  );
}

export default App;
