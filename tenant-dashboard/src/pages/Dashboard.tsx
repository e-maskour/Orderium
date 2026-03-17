import { useTenants } from '../hooks/useTenants'
import { SkeletonCard } from '../components/Skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { Link } from 'react-router-dom'
import {
    Building2, Users, TrendingUp, AlertTriangle,
    Clock, CheckCircle, XCircle, ArrowRight, Plus,
    BarChart2, Activity,
} from 'lucide-react'

function MetricCard({
    label,
    value,
    icon,
    color,
    sub,
    loading,
}: {
    label: string
    value: number | string
    icon: React.ReactNode
    color: string
    sub?: string
    loading?: boolean
}) {
    if (loading) return <SkeletonCard />
    return (
        <div className="card p-5 flex items-start gap-4 animate-fade-in">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
            </div>
        </div>
    )
}

function PlanBar({ plan, count, total }: { plan: string; count: number; total: number }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0
    const colors: Record<string, string> = {
        trial: 'bg-blue-400',
        basic: 'bg-indigo-400',
        pro: 'bg-violet-500',
        enterprise: 'bg-purple-600',
    }
    return (
        <div className="flex items-center gap-3 text-sm">
            <span className="w-20 text-xs capitalize text-slate-600 dark:text-slate-400">{plan}</span>
            <div className="flex-1 rounded-full bg-slate-100 dark:bg-slate-700 h-2">
                <div
                    className={`h-2 rounded-full transition-all duration-500 ${colors[plan] ?? 'bg-slate-400'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-8 text-right text-xs font-medium text-slate-700 dark:text-slate-300">{count}</span>
        </div>
    )
}

export function Dashboard() {
    const { data: allData, isLoading } = useTenants({ limit: 100 })
    const tenants = allData?.data ?? []
    const total = allData?.total ?? 0

    const byStatus = (s: string) => tenants.filter((t) => t.status === s).length
    const active = byStatus('active')
    const trial = byStatus('trial')
    const expired = byStatus('expired')
    const suspended = byStatus('suspended')
    const disabled = byStatus('disabled')
    const archived = byStatus('archived')

    const byPlan = (p: string) => tenants.filter((t) => t.subscriptionPlan === p).length

    // Expiring soon (≤ 7 days)
    const expiringSoon = tenants
        .filter((t) => t.status === 'trial' && (t.trialDaysRemaining ?? 99) <= 7)
        .sort((a, b) => (a.trialDaysRemaining ?? 0) - (b.trialDaysRemaining ?? 0))

    const recent = [...tenants]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6)

    return (
        <div className="px-8 py-8 space-y-8 animate-fade-in">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Platform overview &mdash; {total} tenant{total !== 1 ? 's' : ''} total
                    </p>
                </div>
                <Link
                    to="/tenants/new"
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Tenant
                </Link>
            </div>

            {/* Alert: expiring trials */}
            {!isLoading && expiringSoon.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800/50 dark:bg-amber-900/20 animate-fade-in">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                {expiringSoon.length} trial{expiringSoon.length > 1 ? 's' : ''} expiring within 7 days
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {expiringSoon.map((t) => (
                                    <Link
                                        key={t.id}
                                        to={`/tenants/${t.id}`}
                                        className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 transition dark:bg-amber-900/40 dark:text-amber-400"
                                    >
                                        {t.name}
                                        <span className="opacity-70">
                                            — {t.trialDaysRemaining === 0 ? 'today!' : `${t.trialDaysRemaining}d`}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <Link to="/tenants?status=trial" className="shrink-0 text-xs font-medium text-amber-600 hover:underline">
                            View all →
                        </Link>
                    </div>
                </div>
            )}

            {/* Metrics row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                ) : (
                    <>
                        <MetricCard label="Total Tenants" value={total} icon={<Building2 className="h-5 w-5 text-slate-700 dark:text-slate-300" />} color="bg-slate-100 dark:bg-slate-700" />
                        <MetricCard label="Active" value={active} sub={`${total > 0 ? Math.round((active / total) * 100) : 0}%`} icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} color="bg-emerald-50 dark:bg-emerald-900/30" />
                        <MetricCard label="Trial" value={trial} sub={`${total > 0 ? Math.round((trial / total) * 100) : 0}%`} icon={<Clock className="h-5 w-5 text-blue-600" />} color="bg-blue-50 dark:bg-blue-900/30" />
                        <MetricCard label="Expired" value={expired} icon={<XCircle className="h-5 w-5 text-orange-500" />} color="bg-orange-50 dark:bg-orange-900/30" />
                        <MetricCard label="Suspended" value={suspended} icon={<AlertTriangle className="h-5 w-5 text-red-500" />} color="bg-red-50 dark:bg-red-900/30" />
                        <MetricCard label="Disabled" value={disabled + archived} sub={`${disabled} disabled / ${archived} archived`} icon={<XCircle className="h-5 w-5 text-slate-400" />} color="bg-slate-100 dark:bg-slate-700" />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Plan distribution */}
                <div className="card p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-indigo-500" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Plan Distribution</h2>
                    </div>
                    {isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-6 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(['trial', 'basic', 'pro', 'enterprise'] as const).map((p) => (
                                <PlanBar key={p} plan={p} count={byPlan(p)} total={total} />
                            ))}
                        </div>
                    )}

                    {/* Status summary */}
                    <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <p className="mb-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status breakdown</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                                { label: 'Active', v: active, cls: 'text-emerald-600 dark:text-emerald-400' },
                                { label: 'Trial', v: trial, cls: 'text-blue-600 dark:text-blue-400' },
                                { label: 'Expired', v: expired, cls: 'text-orange-500' },
                                { label: 'Suspended', v: suspended, cls: 'text-red-500' },
                                { label: 'Disabled', v: disabled, cls: 'text-slate-500' },
                                { label: 'Archived', v: archived, cls: 'text-slate-400' },
                            ].map(({ label, v, cls }) => (
                                <div key={label} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                                    <p className={`text-lg font-bold ${cls}`}>{v}</p>
                                    <p className="text-[10px] text-slate-500">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recently added */}
                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-indigo-500" />
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recently Added</h2>
                        </div>
                        <Link
                            to="/tenants"
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                        >
                            View all <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="p-5 text-center text-sm text-slate-400">Loading…</div>
                    ) : recent.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <Building2 className="h-10 w-10 text-slate-200 dark:text-slate-700 mb-3" />
                            <p className="text-sm font-medium text-slate-500">No tenants yet</p>
                            <Link
                                to="/tenants/new"
                                className="mt-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                                Create your first tenant →
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {recent.map((t) => (
                                <li key={t.id}>
                                    <Link
                                        to={`/tenants/${t.id}`}
                                        className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
                                                style={{ backgroundColor: t.primaryColor ?? '#6366f1' }}
                                            >
                                                {t.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                                    {t.name}
                                                </p>
                                                <p className="text-xs text-slate-400">{t.slug}</p>
                                            </div>
                                        </div>
                                        <div className="ml-4 flex shrink-0 items-center gap-3">
                                            <StatusBadge status={t.status} trialDaysRemaining={t.trialDaysRemaining} />
                                            <span className="hidden text-xs text-slate-400 sm:block">
                                                {new Date(t.createdAt).toLocaleDateString()}
                                            </span>
                                            <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}

