import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { OverlayPanelProvider } from './context/OverlayPanelContext';
import { GlobalOverlayPanel } from './components/GlobalOverlayPanel';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PushNotificationProvider } from './components/PushNotificationProvider';
import { Toaster } from './components/ui/sonner';
import { AIAssistantOverlay, AIAssistantButton } from './components/AIAssistant';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DeliveryPersons from './pages/DeliveryPersons';
import Orders from './pages/Orders';
import POS from './pages/POS';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import Products from './pages/Products';
import ProductCreate from './pages/ProductCreate';
import ProductDetail from './pages/ProductDetail';
import Categories from './pages/Categories';
import Customers from './pages/Customers';
import CustomerCreate from './pages/CustomerCreate';
import CustomerEdit from './pages/CustomerEdit';
import CustomerDetail from './pages/CustomerDetail';
import Fournisseurs from './pages/Fournisseurs';
import FournisseurCreate from './pages/FournisseurCreate';
import FournisseurEdit from './pages/FournisseurEdit';
import FournisseurDetail from './pages/FournisseurDetail';
import {
  FactureVenteList,
  FactureVenteCreate,
  FactureVenteEdit,
  FactureAchatList,
  FactureAchatCreate,
  FactureAchatEdit,
  DevisVenteList,
  DevisVenteCreate,
  DevisVenteEdit,
  BonLivraisonList,
  BonLivraisonCreate,
  BonLivraisonEdit,
  DemandeAchatCreate,
  DemandeAchatEdit,
  BonAchatCreate,
  BonAchatEdit,
} from './pages/documents';
import QuotePreviewPage from './pages/QuotePreviewPage';
import DemandePrix from './pages/DemandePrix';
import BonAchat from './pages/BonAchat';
import PaiementsVente from './pages/PaiementsVente';
import PaiementsAchat from './pages/PaiementsAchat';
import Configurations from './pages/Configurations';
import Taxes from './pages/configurations/Taxes';
import Currencies from './pages/configurations/Currencies';
import PaymentTerms from './pages/configurations/PaymentTerms';
import Sequences from './pages/configurations/Sequences';
import UnitsOfMeasure from './pages/configurations/UnitsOfMeasure';
import CompanySettings from './pages/configurations/CompanySettings';
import Warehouses from './pages/Warehouses';
import StockMovements from './pages/StockMovements';
import InventoryAdjustments from './pages/InventoryAdjustments';
import Notifications from './pages/Notifications';

const queryClient = new QueryClient();
const ENABLE_CHAT_AI_AGENT = import.meta.env.VITE_ENABLE_CHAT_AI_AGENT === 'true';

function App() {
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  // Keyboard shortcut: Cmd+K / Ctrl+K to toggle AI assistant
  useEffect(() => {
    if (!ENABLE_CHAT_AI_AGENT) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsAIAssistantOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <PushNotificationProvider />
          <OverlayPanelProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
              {/* Public Routes - No Authentication Required */}
              <Route path="/login" element={<Login />} />
              <Route path="/preview/quote/:token" element={<QuotePreviewPage />} />
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
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout/success"
                element={
                  <ProtectedRoute>
                    <OrderSuccessPage />
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
                path="/products/create"
                element={
                  <ProtectedRoute>
                    <ProductCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products/:id"
                element={
                  <ProtectedRoute>
                    <ProductDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <ProtectedRoute>
                    <Categories />
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
              {/* Devis - New Unified System */}
              <Route
                path="/devis"
                element={
                  <ProtectedRoute>
                    <DevisVenteList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/devis/create"
                element={
                  <ProtectedRoute>
                    <DevisVenteCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/devis/:id"
                element={
                  <ProtectedRoute>
                    <DevisVenteEdit />
                  </ProtectedRoute>
                }
              />
              {/* Bons de Livraison - New Unified System */}
              <Route
                path="/bons-livraison"
                element={
                  <ProtectedRoute>
                    <BonLivraisonList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bons-livraison/create"
                element={
                  <ProtectedRoute>
                    <BonLivraisonCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bons-livraison/:id"
                element={
                  <ProtectedRoute>
                    <BonLivraisonEdit />
                  </ProtectedRoute>
                }
              />
              {/* Legacy route redirect */}
              <Route path="/bon-livraison" element={<Navigate to="/bons-livraison" replace />} />
              
              {/* Factures de Vente - New Unified System */}
              <Route
                path="/factures/vente"
                element={
                  <ProtectedRoute>
                    <FactureVenteList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/factures/vente/create"
                element={
                  <ProtectedRoute>
                    <FactureVenteCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/factures/vente/:id"
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
              
              {/* Factures d'Achat - New Unified System */}
              <Route
                path="/factures/achat"
                element={
                  <ProtectedRoute>
                    <FactureAchatList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/factures/achat/create"
                element={
                  <ProtectedRoute>
                    <FactureAchatCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/factures/achat/:id"
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
                path="/demande-prix"
                element={
                  <ProtectedRoute>
                    <DemandePrix />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/demande-prix/create"
                element={
                  <ProtectedRoute>
                    <DemandeAchatCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/demande-prix/:id"
                element={
                  <ProtectedRoute>
                    <DemandeAchatEdit />
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
                path="/bon-achat/create"
                element={
                  <ProtectedRoute>
                    <BonAchatCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bon-achat/:id"
                element={
                  <ProtectedRoute>
                    <BonAchatEdit />
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
              <Route
                path="/configurations/sequences"
                element={
                  <ProtectedRoute>
                    <Sequences />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/uom"
                element={
                  <ProtectedRoute>
                    <UnitsOfMeasure />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configurations/company"
                element={
                  <ProtectedRoute>
                    <CompanySettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/warehouses"
                element={
                  <ProtectedRoute>
                    <Warehouses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock-movements"
                element={
                  <ProtectedRoute>
                    <StockMovements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory-adjustments"
                element={
                  <ProtectedRoute>
                    <InventoryAdjustments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <Toaster />
              <GlobalOverlayPanel />
              
              {/* AI Assistant - Available on all pages */}
              {ENABLE_CHAT_AI_AGENT && (
                <>
                  {!isAIAssistantOpen && (
                    <AIAssistantButton onClick={() => setIsAIAssistantOpen(true)} />
                  )}
                  <AIAssistantOverlay
                    isOpen={isAIAssistantOpen}
                    onClose={() => setIsAIAssistantOpen(false)}
                  />
                </>
              )}
          </BrowserRouter>
        </OverlayPanelProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
