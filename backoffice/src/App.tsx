import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrimeReactProvider } from 'primereact/api';
import { orderiumPrimeConfig } from '@orderium/ui';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PushNotificationProvider } from './components/PushNotificationProvider';
import { Toaster } from 'sileo';
import 'sileo/styles.css';
import { AIAssistantOverlay, AIAssistantButton } from './components/AIAssistant';
import Login from './pages/Login';

// Lazy-loaded pages for code splitting
const DeliveryPersons = lazy(() => import('./pages/DeliveryPersons'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const ProductCreate = lazy(() => import('./pages/ProductCreate'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Categories = lazy(() => import('./pages/Categories'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerCreate = lazy(() => import('./pages/CustomerCreate'));
const CustomerEdit = lazy(() => import('./pages/CustomerEdit'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Fournisseurs = lazy(() => import('./pages/Fournisseurs'));
const FournisseurCreate = lazy(() => import('./pages/FournisseurCreate'));
const FournisseurEdit = lazy(() => import('./pages/FournisseurEdit'));
const FournisseurDetail = lazy(() => import('./pages/FournisseurDetail'));
const QuotePreviewPage = lazy(() => import('./pages/QuotePreviewPage'));
const DemandePrix = lazy(() => import('./pages/DemandePrix'));
const BonAchat = lazy(() => import('./pages/BonAchat'));
const PaiementsVente = lazy(() => import('./pages/PaiementsVente'));
const PaiementsAchat = lazy(() => import('./pages/PaiementsAchat'));
const Configurations = lazy(() => import('./pages/Configurations'));
const Taxes = lazy(() => import('./pages/configurations/Taxes'));
const Currencies = lazy(() => import('./pages/configurations/Currencies'));
const PaymentTerms = lazy(() => import('./pages/configurations/PaymentTerms'));
const Sequences = lazy(() => import('./pages/configurations/Sequences'));
const UnitsOfMeasure = lazy(() => import('./pages/configurations/UnitsOfMeasure'));
const CompanySettings = lazy(() => import('./pages/configurations/CompanySettings'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const StockMovements = lazy(() => import('./pages/StockMovements'));
const InventoryAdjustments = lazy(() => import('./pages/InventoryAdjustments'));
const Notifications = lazy(() => import('./pages/Notifications'));
const POS = lazy(() => import('./pages/POS'));
const Products = lazy(() => import('./pages/Products'));
const Orders = lazy(() => import('./pages/Orders'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Document pages
const FactureVenteList = lazy(() => import('./pages/documents/FactureVenteList'));
const FactureVenteCreate = lazy(() => import('./pages/documents/FactureVenteCreateWrapper'));
const FactureVenteEdit = lazy(() => import('./pages/documents/FactureVenteEditWrapper'));
const FactureAchatList = lazy(() => import('./pages/documents/FactureAchatList'));
const FactureAchatCreate = lazy(() => import('./pages/documents/FactureAchatCreateWrapper'));
const FactureAchatEdit = lazy(() => import('./pages/documents/FactureAchatEditWrapper'));
const DevisVenteList = lazy(() => import('./pages/documents/DevisVenteList'));
const DevisVenteCreate = lazy(() => import('./pages/documents/DevisVenteCreateWrapper'));
const DevisVenteEdit = lazy(() => import('./pages/documents/DevisVenteEditWrapper'));
const BonLivraisonList = lazy(() => import('./pages/documents/BonLivraisonList'));
const BonLivraisonCreate = lazy(() => import('./pages/documents/BonLivraisonCreateWrapper'));
const BonLivraisonEdit = lazy(() => import('./pages/documents/BonLivraisonEditWrapper'));
const DemandeAchatCreate = lazy(() => import('./pages/documents/DemandeAchatCreateWrapper'));
const DemandeAchatEdit = lazy(() => import('./pages/documents/DemandeAchatEditWrapper'));
const BonAchatCreate = lazy(() => import('./pages/documents/BonAchatCreateWrapper'));
const BonAchatEdit = lazy(() => import('./pages/documents/BonAchatEditWrapper'));

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
    <PrimeReactProvider value={orderiumPrimeConfig}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <PushNotificationProvider />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Suspense fallback={<div className="flex align-items-center justify-content-center" style={{ height: '100vh' }}><i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: 'var(--primary-color)' }} /></div>}>
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
              </Suspense>
              <Toaster position="top-center" theme="light" />

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
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </PrimeReactProvider>
  );
}

export default App;
