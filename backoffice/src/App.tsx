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
import { REPORT_VIEW_PERMISSIONS } from './modules/access';
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
const Brands = lazy(() => import('./pages/Brands'));
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
const ClientRequestsPage = lazy(() => import('./pages/ClientRequestsPage'));
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

// Analytics pages
const AnalyticsHub = lazy(() => import('./pages/analytics/AnalyticsHub'));
const SalesRevenuePage = lazy(() => import('./pages/analytics/sales/SalesRevenuePage'));
const SalesTopProductsPage = lazy(() => import('./pages/analytics/sales/SalesTopProductsPage'));
const SalesByCustomerPage = lazy(() => import('./pages/analytics/sales/SalesByCustomerPage'));
const SalesByCategoryPage = lazy(() => import('./pages/analytics/sales/SalesByCategoryPage'));
const SalesByPosPage = lazy(() => import('./pages/analytics/sales/SalesByPosPage'));
const PurchasesByPeriodPage = lazy(
  () => import('./pages/analytics/purchases/PurchasesByPeriodPage'),
);
const PurchasesTopSuppliersPage = lazy(
  () => import('./pages/analytics/purchases/PurchasesTopSuppliersPage'),
);
const PurchasesByProductPage = lazy(
  () => import('./pages/analytics/purchases/PurchasesByProductPage'),
);
const JournalVentePage = lazy(() => import('./pages/analytics/invoices/JournalVentePage'));
const JournalAchatPage = lazy(() => import('./pages/analytics/invoices/JournalAchatPage'));
const TvaSummaryPage = lazy(() => import('./pages/analytics/invoices/TvaSummaryPage'));
const OutstandingInvoicesPage = lazy(
  () => import('./pages/analytics/invoices/OutstandingInvoicesPage'),
);
const InvoiceAgingPage = lazy(() => import('./pages/analytics/invoices/InvoiceAgingPage'));
const CashflowPage = lazy(() => import('./pages/analytics/payments/CashflowPage'));
const PaymentsByMethodPage = lazy(() => import('./pages/analytics/payments/PaymentsByMethodPage'));
const InOutFlowPage = lazy(() => import('./pages/analytics/payments/InOutFlowPage'));
const TopClientsPage = lazy(() => import('./pages/analytics/clients/TopClientsPage'));
const ClientAgingPage = lazy(() => import('./pages/analytics/clients/ClientAgingPage'));
const InactiveClientsPage = lazy(() => import('./pages/analytics/clients/InactiveClientsPage'));
const ClientStatementPage = lazy(() => import('./pages/analytics/clients/ClientStatementPage'));
const TopSuppliersPage = lazy(() => import('./pages/analytics/suppliers/TopSuppliersPage'));
const SupplierAgingPage = lazy(() => import('./pages/analytics/suppliers/SupplierAgingPage'));
const SupplierStatementPage = lazy(
  () => import('./pages/analytics/suppliers/SupplierStatementPage'),
);
const StockValuationPage = lazy(() => import('./pages/analytics/stock/StockValuationPage'));
const LowStockPage = lazy(() => import('./pages/analytics/stock/LowStockPage'));
const StockMovementsPage = lazy(() => import('./pages/analytics/stock/StockMovementsPage'));
const SlowDeadStockPage = lazy(() => import('./pages/analytics/stock/SlowDeadStockPage'));
const StockByWarehousePage = lazy(() => import('./pages/analytics/stock/StockByWarehousePage'));
const ProductPerformancePage = lazy(
  () => import('./pages/analytics/products/ProductPerformancePage'),
);
const MarginAnalysisPage = lazy(() => import('./pages/analytics/products/MarginAnalysisPage'));
const NeverSoldProductsPage = lazy(
  () => import('./pages/analytics/products/NeverSoldProductsPage'),
);

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
                              <ProtectedRoute permission="dashboard.view">
                                <Dashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/delivery-persons"
                            element={
                              <ProtectedRoute permission="delivery.view">
                                <DeliveryPersons />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/orders"
                            element={
                              <ProtectedRoute permission="orders.view">
                                <Orders />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/orders/:id"
                            element={
                              <ProtectedRoute permission="orders.view">
                                <OrderDetailPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/caisse"
                            element={
                              <ProtectedRoute permission="caisse.view">
                                <Caisse />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/pos"
                            element={
                              <ProtectedRoute permission="pos.use">
                                <POS />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/checkout"
                            element={
                              <ProtectedRoute permission="orders.create">
                                <CheckoutPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/checkout/success"
                            element={
                              <ProtectedRoute permission="orders.create">
                                <OrderSuccessPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/products"
                            element={
                              <ProtectedRoute permission="products.view">
                                <Products />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/products/create"
                            element={
                              <ProtectedRoute permission="products.create">
                                <ProductCreate />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/products/:id"
                            element={
                              <ProtectedRoute permission="products.view">
                                <ProductDetail />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/categories"
                            element={
                              <ProtectedRoute permission="categories.view">
                                <Categories />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/brands"
                            element={
                              <ProtectedRoute permission="brands.view">
                                <Brands />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/customers"
                            element={
                              <ProtectedRoute permission="partners.view">
                                <Customers />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/customers/create"
                            element={
                              <ProtectedRoute permission="partners.create">
                                <CustomerCreate />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/customers/:id"
                            element={
                              <ProtectedRoute permission="partners.view">
                                <CustomerEdit />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/fournisseurs"
                            element={
                              <ProtectedRoute permission="partners.view">
                                <Fournisseurs />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/fournisseurs/create"
                            element={
                              <ProtectedRoute permission="partners.create">
                                <FournisseurCreate />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/fournisseurs/:id"
                            element={
                              <ProtectedRoute permission="partners.view">
                                <FournisseurEdit />
                              </ProtectedRoute>
                            }
                          />
                          {/* Devis - New Unified System */}
                          <Route
                            path="/devis"
                            element={
                              <ProtectedRoute permission="quotes.view">
                                <DevisVenteList />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/devis/create"
                            element={
                              <ProtectedRoute permission="quotes.create">
                                <DevisVenteCreate />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/devis/:id"
                            element={
                              <ProtectedRoute permission="quotes.view">
                                <DevisVenteEdit />
                              </ProtectedRoute>
                            }
                          />
                          {/* Bons de Livraison - New Unified System */}
                          <Route
                            path="/bons-livraison"
                            element={
                              <ProtectedRoute permission="orders.view">
                                <BonLivraisonList />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/bons-livraison/create"
                            element={
                              <ProtectedRoute permission="orders.create">
                                <BonLivraisonCreate />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/bons-livraison/:id"
                            element={
                              <ProtectedRoute permission="orders.view">
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
                              <ProtectedRoute permission="invoices.view">
                                <FactureVenteList />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/factures/vente/create"
                            element={
                              <ProtectedRoute permission="invoices.create">
                                <FactureVenteCreate />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/factures/vente/:id"
                            element={
                              <ProtectedRoute permission="invoices.view">
                                <FactureVenteEdit />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/paiements-vente"
                            element={
                              <ProtectedRoute permission="payments.view">
                                <PaiementsVente />
                              </ProtectedRoute>
                            }
                          />

                          {/* Factures d'Achat - New Unified System */}
                          <Route
                            path="/factures/achat"
                            element={
                              <ProtectedRoute permission="invoices.view">
                                <FactureAchatList />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/factures/achat/create"
                            element={
                              <ProtectedRoute permission="invoices.create">
                                <FactureAchatCreate />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/factures/achat/:id"
                            element={
                              <ProtectedRoute permission="invoices.view">
                                <FactureAchatEdit />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/paiements-achat"
                            element={
                              <ProtectedRoute permission="payments.view">
                                <PaiementsAchat />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/demande-prix"
                            element={
                              <ProtectedRoute permission="quotes.view">
                                <DemandePrix />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/demande-prix/create"
                            element={
                              <ProtectedRoute permission="quotes.create">
                                <DemandeAchatCreate />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/demande-prix/:id"
                            element={
                              <ProtectedRoute permission="quotes.view">
                                <DemandeAchatEdit />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/bon-achat"
                            element={
                              <ProtectedRoute permission="orders.view">
                                <BonAchat />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/bon-achat/create"
                            element={
                              <ProtectedRoute permission="orders.create">
                                <BonAchatCreate />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/bon-achat/:id"
                            element={
                              <ProtectedRoute permission="orders.view">
                                <BonAchatEdit />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/configurations"
                            element={
                              <ProtectedRoute permission="configurations.view">
                                <Configurations />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/configurations/taxes"
                            element={
                              <ProtectedRoute permission="configurations.view">
                                <Taxes />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/configurations/currencies"
                            element={
                              <ProtectedRoute permission="configurations.view">
                                <Currencies />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/configurations/payment-terms"
                            element={
                              <ProtectedRoute permission="configurations.view">
                                <PaymentTerms />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/configurations/sequences"
                            element={
                              <ProtectedRoute permission="sequences.view">
                                <Sequences />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/configurations/uom"
                            element={
                              <ProtectedRoute permission="uom.view">
                                <UnitsOfMeasure />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/configurations/company"
                            element={
                              <ProtectedRoute permission="configurations.view">
                                <CompanySettings />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/configurations/inventory"
                            element={
                              <ProtectedRoute permission="configurations.view">
                                <InventorySettings />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/configurations/printers"
                            element={
                              <ProtectedRoute permission="printers.view">
                                <Printers />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/warehouses"
                            element={
                              <ProtectedRoute permission="warehouses.view">
                                <Warehouses />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/stock-movements"
                            element={
                              <ProtectedRoute permission="stock.view">
                                <StockMovements />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/inventory-adjustments"
                            element={
                              <ProtectedRoute permission="stock.view">
                                <InventoryAdjustments />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/notifications"
                            element={
                              <ProtectedRoute permission="notifications.view">
                                <Notifications />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/drive"
                            element={
                              <ProtectedRoute permission="drive.view">
                                <DrivePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/users"
                            element={
                              <ProtectedRoute permission="users.view">
                                <UsersPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/client-requests"
                            element={
                              <ProtectedRoute permission="users.view">
                                <ClientRequestsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/roles"
                            element={
                              <ProtectedRoute permission="roles.view">
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
                          {/* Analytics & Reports */}
                          <Route
                            path="/analytics"
                            element={
                              <ProtectedRoute anyPermission={REPORT_VIEW_PERMISSIONS}>
                                <AnalyticsHub />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/sales/revenue"
                            element={
                              <ProtectedRoute permission="reports_sales.view">
                                <SalesRevenuePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/sales/top-products"
                            element={
                              <ProtectedRoute permission="reports_sales.view">
                                <SalesTopProductsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/sales/by-customer"
                            element={
                              <ProtectedRoute permission="reports_sales.view">
                                <SalesByCustomerPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/sales/by-category"
                            element={
                              <ProtectedRoute permission="reports_sales.view">
                                <SalesByCategoryPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/sales/by-pos"
                            element={
                              <ProtectedRoute permission="reports_sales.view">
                                <SalesByPosPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/purchases/by-period"
                            element={
                              <ProtectedRoute permission="reports_purchases.view">
                                <PurchasesByPeriodPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/purchases/top-suppliers"
                            element={
                              <ProtectedRoute permission="reports_purchases.view">
                                <PurchasesTopSuppliersPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/purchases/by-product"
                            element={
                              <ProtectedRoute permission="reports_purchases.view">
                                <PurchasesByProductPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/invoices/journal-vente"
                            element={
                              <ProtectedRoute permission="reports_invoices.view">
                                <JournalVentePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/invoices/journal-achat"
                            element={
                              <ProtectedRoute permission="reports_invoices.view">
                                <JournalAchatPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/invoices/tva"
                            element={
                              <ProtectedRoute permission="reports_invoices.view">
                                <TvaSummaryPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/invoices/outstanding"
                            element={
                              <ProtectedRoute permission="reports_invoices.view">
                                <OutstandingInvoicesPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/invoices/aging"
                            element={
                              <ProtectedRoute permission="reports_invoices.view">
                                <InvoiceAgingPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/payments/cashflow"
                            element={
                              <ProtectedRoute permission="reports_payments.view">
                                <CashflowPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/payments/by-method"
                            element={
                              <ProtectedRoute permission="reports_payments.view">
                                <PaymentsByMethodPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/payments/in-out"
                            element={
                              <ProtectedRoute permission="reports_payments.view">
                                <InOutFlowPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/clients/top"
                            element={
                              <ProtectedRoute permission="reports_clients.view">
                                <TopClientsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/clients/aging"
                            element={
                              <ProtectedRoute permission="reports_clients.view">
                                <ClientAgingPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/clients/inactive"
                            element={
                              <ProtectedRoute permission="reports_clients.view">
                                <InactiveClientsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/clients/statement"
                            element={
                              <ProtectedRoute permission="reports_clients.view">
                                <ClientStatementPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/suppliers/top"
                            element={
                              <ProtectedRoute permission="reports_suppliers.view">
                                <TopSuppliersPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/suppliers/aging"
                            element={
                              <ProtectedRoute permission="reports_suppliers.view">
                                <SupplierAgingPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/suppliers/statement"
                            element={
                              <ProtectedRoute permission="reports_suppliers.view">
                                <SupplierStatementPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/stock/valuation"
                            element={
                              <ProtectedRoute permission="reports_stock.view">
                                <StockValuationPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/stock/low-stock"
                            element={
                              <ProtectedRoute permission="reports_stock.view">
                                <LowStockPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/stock/movements"
                            element={
                              <ProtectedRoute permission="reports_stock.view">
                                <StockMovementsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/stock/slow-dead"
                            element={
                              <ProtectedRoute permission="reports_stock.view">
                                <SlowDeadStockPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/stock/by-warehouse"
                            element={
                              <ProtectedRoute permission="reports_stock.view">
                                <StockByWarehousePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/products/performance"
                            element={
                              <ProtectedRoute permission="reports_products.view">
                                <ProductPerformancePage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/products/margin"
                            element={
                              <ProtectedRoute permission="reports_products.view">
                                <MarginAnalysisPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics/products/never-sold"
                            element={
                              <ProtectedRoute permission="reports_products.view">
                                <NeverSoldProductsPage />
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
