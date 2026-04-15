import { useState, useEffect, lazy, Suspense, ReactNode, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrimeReactProvider } from 'primereact/api';
import backofficeConfig from './theme-preset';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PushNotificationProvider } from './components/PushNotificationProvider';
import { Toaster, ConfirmProvider, AlertProvider } from '@orderium/ui';
import { AIAssistantOverlay, AIAssistantButton } from './components/AIAssistant';
import { KeyboardProvider } from './context/KeyboardContext';
import { POSKeyboard } from './components/keyboard/POSKeyboard';
import { KeyboardToggle } from './components/keyboard/KeyboardToggle';
import { useKeyboard } from './hooks/useKeyboard';

/** Closes the keyboard automatically when navigating away from the POS page. */
function KeyboardRouteWatcher() {
  const { hideKeyboard, isVisible } = useKeyboard();
  const location = useLocation();
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  useEffect(() => {
    // Only close when the route changes away from /pos — not when isVisible changes
    if (!location.pathname.startsWith('/pos') && isVisibleRef.current) {
      hideKeyboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
}
import Login from './pages/Login';
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage'));

// ── Onboarding Gate ───────────────────────────────────────────────────────────
// Checks /api/onboarding/status once on app load.
// If not yet onboarded, redirects to /onboarding before showing any other page.
function OnboardingGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const checked = useRef(false);

  useEffect(() => {
    if (location.pathname.startsWith('/onboarding')) return;
    if (checked.current) return;
    checked.current = true;
    // Use a relative URL so the request goes through the Vite dev-server proxy
    // (avoids cross-origin CORS issues when accessed via tenant subdomains like demo.localhost:3001)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    fetch('/api/onboarding/status', { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        const isOnboarded = json?.data?.is_onboarded ?? true;
        if (!isOnboarded) {
          navigate('/onboarding', { replace: true });
        }
      })
      .catch(() => {
        /* fail open — don't block the app */
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

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
const Fournisseurs = lazy(() => import('./pages/Fournisseurs'));
const FournisseurCreate = lazy(() => import('./pages/FournisseurCreate'));
const FournisseurEdit = lazy(() => import('./pages/FournisseurEdit'));
const QuotePreviewPage = lazy(() => import('./pages/QuotePreviewPage'));
const SharedDocumentPage = lazy(() => import('./pages/SharedDocumentPage'));
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
const InventorySettings = lazy(() => import('./pages/configurations/InventorySettings'));
const Printers = lazy(() => import('./pages/configurations/Printers'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const StockMovements = lazy(() => import('./pages/StockMovements'));
const InventoryAdjustments = lazy(() => import('./pages/InventoryAdjustments'));
const Notifications = lazy(() => import('./pages/Notifications'));
const POS = lazy(() => import('./pages/POS'));
const Products = lazy(() => import('./pages/Products'));
const Orders = lazy(() => import('./pages/Orders'));
const Caisse = lazy(() => import('./pages/Caisse'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DrivePage = lazy(() => import('./pages/drive/DrivePage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'));

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
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
    <PrimeReactProvider value={backofficeConfig}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <KeyboardProvider>
            <AuthProvider>
              <PushNotificationProvider />
              <ConfirmProvider>
                <AlertProvider>
                  <Toaster position="bottom-right" />
                  <BrowserRouter
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true,
                    }}
                  >
                    <Suspense
                      fallback={
                        <div
                          className="flex align-items-center justify-content-center"
                          style={{ height: '100vh' }}
                        >
                          <i
                            className="pi pi-spin pi-spinner"
                            style={{ fontSize: '2rem', color: 'var(--primary-color)' }}
                          />
                        </div>
                      }
                    >
                      <OnboardingGate>
                        <Routes>
                          {/* Public Routes - No Authentication Required */}
                          <Route path="/onboarding" element={<OnboardingPage />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/preview/quote/:token" element={<QuotePreviewPage />} />
                          <Route path="/preview/invoice/:token" element={<SharedDocumentPage />} />
                          <Route path="/preview/order/:token" element={<SharedDocumentPage />} />
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
                            path="/orders/:id"
                            element={
                              <ProtectedRoute>
                                <OrderDetailPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/caisse"
                            element={
                              <ProtectedRoute>
                                <Caisse />
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
                            path="/customers/:id"
                            element={
                              <ProtectedRoute>
                                <CustomerEdit />
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
                            path="/fournisseurs/:id"
                            element={
                              <ProtectedRoute>
                                <FournisseurEdit />
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
                          <Route
                            path="/bon-livraison"
                            element={<Navigate to="/bons-livraison" replace />}
                          />

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
                            path="/configurations/inventory"
                            element={
                              <ProtectedRoute>
                                <InventorySettings />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/configurations/printers"
                            element={
                              <ProtectedRoute>
                                <Printers />
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

                          <Route
                            path="/drive"
                            element={
                              <ProtectedRoute>
                                <DrivePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/users"
                            element={
                              <ProtectedRoute>
                                <UsersPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/roles"
                            element={
                              <ProtectedRoute>
                                <RolesPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/profile"
                            element={
                              <ProtectedRoute>
                                <ProfilePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings"
                            element={
                              <ProtectedRoute>
                                <SettingsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings/notifications"
                            element={
                              <ProtectedRoute>
                                <NotificationSettingsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </OnboardingGate>
                    </Suspense>

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
                    {/* POS Virtual Keyboard — available on all pages */}
                    <KeyboardRouteWatcher />
                    <KeyboardToggle />
                    <POSKeyboard />
                  </BrowserRouter>
                </AlertProvider>
              </ConfirmProvider>
            </AuthProvider>
          </KeyboardProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </PrimeReactProvider>
  );
}

export default App;
