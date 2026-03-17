import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Building2, LogOut, Moon, Sun,
    ChevronRight, Settings, CreditCard,
} from 'lucide-react'
import { useState } from 'react'
import { useTenants } from '../hooks/useTenants'

interface Props {
    onLogout: () => void
}

export function Layout({ onLogout }: Props) {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains('dark'),
    )
    const location = useLocation()
    const { data } = useTenants({ limit: 100 })

    // Count expiring trials (≤ 7 days)
    const expiringCount = data?.data?.filter(
        (t) => t.status === 'trial' && (t.trialDaysRemaining ?? 99) <= 7
    ).length ?? 0

    const toggleDark = () => {
        const isDark = !dark
        setDark(isDark)
        document.documentElement.classList.toggle('dark', isDark)
        localStorage.setItem('theme', isDark ? 'dark' : 'light')
    }

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }`

    const isTenantsActive = location.pathname.startsWith('/tenants')

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Sidebar */}
            <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                {/* Brand header */}
                <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                        <span className="text-xs font-bold text-white">O</span>
                    </div>
                    <div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Orderium
                        </span>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                            Admin Portal
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                    <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Main
                    </p>
                    <NavLink to="/" end className={navLinkClass}>
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/tenants"
                        className={() =>
                            `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${isTenantsActive
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                            }`
                        }
                    >
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="flex-1">Tenants</span>
                        {data && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isTenantsActive
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                }`}>
                                {data.total}
                            </span>
                        )}
                    </NavLink>

                    {expiringCount > 0 && (
                        <NavLink
                            to="/tenants?status=trial"
                            className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 transition-all"
                        >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-white">!</span>
                            <span className="flex-1">Expiring Trials</span>
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                {expiringCount}
                            </span>
                        </NavLink>
                    )}

                    <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Billing
                    </p>
                    <NavLink to="/payments" className={navLinkClass}>
                        <CreditCard className="h-4 w-4 shrink-0" />
                        Payments
                        <span className="ml-auto text-[10px] font-medium rounded bg-slate-100 px-1.5 py-0.5 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            soon
                        </span>
                    </NavLink>
                </nav>

                {/* Footer actions */}
                <div className="border-t border-slate-200 p-3 space-y-0.5 dark:border-slate-800">
                    <button
                        onClick={toggleDark}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-all"
                    >
                        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        {dark ? 'Light mode' : 'Dark mode'}
                    </button>
                    <button
                        onClick={onLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    )
}

