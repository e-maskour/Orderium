import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { TenantsList } from './pages/TenantsList'
import { TenantDetail } from './pages/TenantDetail'
import { CreateTenant } from './pages/CreateTenant'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

// Restore dark mode preference on load
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark')
}

export default function App() {
    const { isAuthenticated, login, logout } = useAuth()

    if (!isAuthenticated) {
        return (
            <QueryClientProvider client={queryClient}>
                <Login onLogin={login} />
                <Toaster position="top-right" />
            </QueryClientProvider>
        )
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
                        <Route index element={<Dashboard />} />
                        <Route path="tenants" element={<TenantsList />} />
                        <Route path="tenants/new" element={<CreateTenant />} />
                        <Route path="tenants/:id" element={<TenantDetail />} />
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
    )
}
