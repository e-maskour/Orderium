import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Building2, LogOut, Moon, Sun,
    CreditCard, Menu, X, ChevronRight,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTenants } from '../hooks/useTenants'

interface Props {
    onLogout: () => void
}

export function Layout({ onLogout }: Props) {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains('dark'),
    )
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()
    const { data } = useTenants({ limit: 100 })

    // Close mobile sidebar on route change
    useEffect(() => {
        setSidebarOpen(false)
    }, [location.pathname])

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [sidebarOpen])

    const expiringCount = data?.data?.filter(
        (t) => t.status === 'trial' && (t.trialDaysRemaining ?? 99) <= 7
    ).length ?? 0

    const toggleDark = () => {
        const isDark = !dark
        setDark(isDark)
        document.documentElement.classList.toggle('dark', isDark)
        localStorage.setItem('theme', isDark ? 'dark' : 'light')
    }

    const isTenantsActive = location.pathname.startsWith('/tenants')

    const activeClass = 'nav-link bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
    const inactiveClass = 'nav-link text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100'

    const SidebarInner = () => (
        <>
            {/* Brand */}
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800/80">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30">
                    <span className="text-sm font-extrabold text-white tracking-tight">O</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate leading-tight">
                        Orderium
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Admin Portal
                    </p>
                </div>
                {/* Close button – mobile only */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden icon-btn h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    aria-label="Close sidebar"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                <p className="nav-section-title">Main Menu</p>

                <NavLink to="/" end className={({ isActive }) => isActive ? activeClass : inactiveClass}>
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    <span className="flex-1">Dashboard</span>
                </NavLink>

                <NavLink
                    to="/tenants"
                    className={() => isTenantsActive ? activeClass : inactiveClass}
                >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="flex-1">Tenants</span>
                    {data && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isTenantsActive
                                ? 'bg-white/25 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700/80 dark:text-slate-400'
                            }`}>
                            {data.total}
                        </span>
                    )}
                </NavLink>

                {expiringCount > 0 && (
                    <NavLink
                        to="/tenants?status=trial"
                        className="nav-link text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
                    >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[8px] font-extrabold text-white leading-none">!</span>
                        <span className="flex-1">Expiring Trials</span>
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            {expiringCount}
                        </span>
                    </NavLink>
                )}

                <p className="nav-section-title">Billing</p>

                <div className="nav-link cursor-not-allowed text-slate-400 dark:text-slate-600 select-none">
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <span className="flex-1">Payments</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400 dark:bg-slate-800 dark:text-slate-500 tracking-wide">
                        Soon
                    </span>
                </div>
            </nav>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-100 p-3 space-y-0.5 dark:border-slate-800/80">
                {/* Admin badge */}
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white shadow-sm">
                        A
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">Admin</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Super Admin</p>
                    </div>
                </div>

                <button
                    onClick={toggleDark}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100"
                >
                    {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                    {dark ? 'Light Mode' : 'Dark Mode'}
                </button>

                <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign Out
                </button>
            </div>
        </>
    )

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080d1a]">

            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar — slide-over on mobile, fixed on desktop */}
            <aside
                className={[
                    'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col',
                    'border-r border-slate-200/80 bg-white dark:border-slate-800/60 dark:bg-slate-900',
                    'transition-transform duration-300 ease-in-out',
                    sidebarOpen ? 'translate-x-0 shadow-card-xl' : '-translate-x-full',
                    'lg:relative lg:translate-x-0 lg:shadow-none',
                ].join(' ')}
            >
                <SidebarInner />
            </aside>

            {/* Content area */}
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

                {/* Mobile top bar */}
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 glass dark:border-slate-800/60 dark:bg-slate-900/80 lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="icon-btn h-9 w-9 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        aria-label="Open sidebar"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                            <span className="text-[11px] font-extrabold text-white">O</span>
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Orderium</span>
                    </div>

                    <button
                        onClick={toggleDark}
                        className="icon-btn h-9 w-9 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        aria-label="Toggle theme"
                    >
                        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

