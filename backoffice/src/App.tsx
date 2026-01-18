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
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import CustomerCreate from './pages/CustomerCreate';
import CustomerEdit from './pages/CustomerEdit';
import CustomerDetail from './pages/CustomerDetail';
import Fournisseurs from './pages/Fournisseurs';
import FournisseurCreate from './pages/FournisseurCreate';
import FournisseurEdit from './pages/FournisseurEdit';
import FournisseurDetail from './pages/FournisseurDetail';
import Devis from './pages/Devis';
import BonLivraison from './pages/BonLivraison';
import DemandePrix from './pages/DemandePrix';
import BonAchat from './pages/BonAchat';
import FactureAchat from './pages/FactureAchat';
import FactureAchatCreate from './pages/FactureAchatCreate';
import FactureAchatEdit from './pages/FactureAchatEdit';
import FactureVente from './pages/FactureVente';
import FactureVenteCreate from './pages/FactureVenteCreate';
import FactureVenteEdit from './pages/FactureVenteEdit';
import PaiementsVente from './pages/PaiementsVente';
import PaiementsAchat from './pages/PaiementsAchat';
import Configurations from './pages/Configurations';
import Taxes from './pages/configurations/Taxes';
import Currencies from './pages/configurations/Currencies';
import PaymentTerms from './pages/configurations/PaymentTerms';

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
                path="/customers/create"
                element={
                  <ProtectedRoute>
                    <CustomerCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers/edit/:id"
                element={
                  <ProtectedRoute>
                    <CustomerEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers/:id"
                element={
                  <ProtectedRoute>
                    <CustomerDetail />
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
              <Route
                path="/fournisseurs/create"
                element={
                  <ProtectedRoute>
                    <FournisseurCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fournisseurs/edit/:id"
                element={
                  <ProtectedRoute>
                    <FournisseurEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fournisseurs/:id"
                element={
                  <ProtectedRoute>
                    <FournisseurDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/devis"
                element={
                  <ProtectedRoute>
                    <Devis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bon-livraison"
                element={
                  <ProtectedRoute>
                    <BonLivraison />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/facture-vente"
                element={
                  <ProtectedRoute>
                    <FactureVente />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/facture-vente/create"
                element={
                  <ProtectedRoute>
                    <FactureVenteCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/facture-vente/edit/:id"
                element={
                  <ProtectedRoute>
                    <FactureVenteEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/paiements-vente"
                element={
                  <ProtectedRoute>
                    <PaiementsVente />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/demande-prix"
                element={
                  <ProtectedRoute>
                    <DemandePrix />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bon-achat"
                element={
                  <ProtectedRoute>
                    <BonAchat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/facture-achat"
                element={
                  <ProtectedRoute>
                    <FactureAchat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/facture-achat/create"
                element={
                  <ProtectedRoute>
                    <FactureAchatCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/facture-achat/edit/:id"
                element={
                  <ProtectedRoute>
                    <FactureAchatEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/paiements-achat"
                element={
                  <ProtectedRoute>
                    <PaiementsAchat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations"
                element={
                  <ProtectedRoute>
                    <Configurations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/taxes"
                element={
                  <ProtectedRoute>
                    <Taxes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/currencies"
                element={
                  <ProtectedRoute>
                    <Currencies />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/payment-terms"
                element={
                  <ProtectedRoute>
                    <PaymentTerms />
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
