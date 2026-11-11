import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';

// Pages load on demand: the sign-in screen and first page stay small.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Leads = lazy(() => import('./pages/Leads').then((m) => ({ default: m.Leads })));
const TenantsList = lazy(() =>
  import('./pages/TenantsList').then((m) => ({ default: m.TenantsList })),
);
const TenantDetail = lazy(() =>
  import('./pages/TenantDetail').then((m) => ({ default: m.TenantDetail })),
);
const CreateTenant = lazy(() =>
  import('./pages/CreateTenant').then((m) => ({ default: m.CreateTenant })),
);
const MigrationManager = lazy(() =>
  import('./pages/MigrationManager').then((m) => ({ default: m.MigrationManager })),
);
const SeederManager = lazy(() =>
  import('./pages/SeederManager').then((m) => ({ default: m.SeederManager })),
);
const Payments = lazy(() => import('./pages/Payments').then((m) => ({ default: m.Payments })));
const Monitoring = lazy(() =>
  import('./pages/Monitoring').then((m) => ({ default: m.Monitoring })),
);
const TenantUsage = lazy(() =>
  import('./pages/TenantUsage').then((m) => ({ default: m.TenantUsage })),
);
const Health = lazy(() => import('./pages/Health').then((m) => ({ default: m.Health })));
const PaymentDetail = lazy(() =>
  import('./pages/PaymentDetail').then((m) => ({ default: m.PaymentDetail })),
);

/** Wraps a lazily loaded page; the layout stays visible while it loads. */
function page(Component: ComponentType) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center" role="status">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="sr-only">Loading…</span>
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Restore dark mode preference on load
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
}

export default function App() {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <Login onLogin={login} />
        <Toaster position="top-right" />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route element={<Layout onLogout={logout} />}>
            <Route index element={page(Dashboard)} />
            <Route path="tenants" element={page(TenantsList)} />
            <Route path="tenants/new" element={page(CreateTenant)} />
            <Route path="tenants/:id" element={page(TenantDetail)} />
            <Route path="monitoring" element={page(Monitoring)} />
            <Route path="monitoring/tenants" element={page(TenantUsage)} />
            <Route path="monitoring/health" element={page(Health)} />
            <Route path="leads" element={page(Leads)} />
            <Route path="payments" element={page(Payments)} />
            <Route path="payments/:id" element={page(PaymentDetail)} />
            <Route path="migrations" element={page(MigrationManager)} />
            <Route path="seeders" element={page(SeederManager)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-sm font-medium',
          style: {
            borderRadius: '10px',
            background: '#fff',
            color: '#171717',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
