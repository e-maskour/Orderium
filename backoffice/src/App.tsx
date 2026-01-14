import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DeliveryPersons from './pages/DeliveryPersons';
import Orders from './pages/Orders';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Fournisseurs from './pages/Fournisseurs';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/delivery-persons"
                element={
                  <ProtectedRoute>
                    <DeliveryPersons />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <Invoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices/create"
                element={
                  <ProtectedRoute>
                    <CreateInvoice />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices/edit/:id"
                element={
                  <ProtectedRoute>
                    <CreateInvoice />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute>
                    <POS />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <Products />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute>
                    <Customers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fournisseurs"
                element={
                  <ProtectedRoute>
                    <Fournisseurs />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
