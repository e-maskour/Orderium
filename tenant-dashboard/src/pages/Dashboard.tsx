import { useTenants } from '../hooks/useTenants'
import { SkeletonCard, SkeletonListItem } from '../components/Skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { Link } from 'react-router-dom'
import {
    Building2, AlertTriangle,
    Clock, CheckCircle, XCircle, ArrowRight, Plus,
    BarChart3, Activity, Shield, Archive, Layers,
    TrendingUp,
} from 'lucide-react'

// ─── KPI card ────────────────────────────────────────────────────────────────
interface KpiCardProps {
    label: string
    value: number | string
    sub?: string
    icon: React.ReactNode
    iconBg: string
    loading?: boolean
    trend?: { value: number; label: string }
    linkTo?: string
}

function KpiCard({ label, value, sub, icon, iconBg, loading, trend, linkTo }: KpiCardProps) {
    if (loading) return <SkeletonCard />

    const content = (
        <div className="stat-card group animate-fade-in">
            <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 ${iconBg}`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${trend.value >= 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        <TrendingUp className={`h-3 w-3 ${trend.value < 0 ? 'rotate-180' : ''}`} />
                        {trend.label}
                    </div>
                )}
            </div>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums leading-none">
                {value}
            </p>
            <p className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">{label}</p>
            {sub && (
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-600 leading-tight">{sub}</p>
            )}
        </div>
    )

    if (linkTo) {
        return <Link to={linkTo}>{content}</Link>
    }
    return content
}

// ─── Plan distribution bar ───────────────────────────────────────────────────
function PlanBar({ plan, count, total, color, dotColor }: {
    plan: string; count: number; total: number; color: string; dotColor: string
}) {
    const pct = total > 0 ? (count / total) * 100 : 0
    const pctDisplay = Math.round(pct)

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">{plan}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">{count}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums">({pctDisplay}%)</span>
                </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}

// ─── Status chip ─────────────────────────────────────────────────────────────
function StatusChip({ label, value, textClass, bgClass }: {
    label: string; value: number; textClass: string; bgClass: string
}) {
    return (
        <div className={`flex flex-col items-center justify-center rounded-xl p-3 ${bgClass}`}>
            <span className={`text-xl font-extrabold tabular-nums leading-none ${textClass}`}>{value}</span>
            <span className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide">{label}</span>
        </div>
    )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
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

    const expiringSoon = tenants
        .filter((t) => t.status === 'trial' && (t.trialDaysRemaining ?? 99) <= 7)
        .sort((a, b) => (a.trialDaysRemaining ?? 0) - (b.trialDaysRemaining ?? 0))

    const recent = [...tenants]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8)

    const healthScore = total > 0 ? Math.round(((active + trial * 0.5) / total) * 100) : 0

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

    return (
        <div className="min-h-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:space-y-8 animate-fade-in">

            {/* ── Page header ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1.5">
                        <span>Orderium</span>
                        <span>/</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Dashboard</span>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                        Overview
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {isLoading
                            ? 'Loading platform data…'
                            : `${total} tenant${total !== 1 ? 's' : ''} · ${active} active · ${trial} on trial`
                        }
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                    <Link to="/tenants" className="btn-secondary">
                        <Building2 className="h-4 w-4" />
                        <span className="hidden xs:inline">All Tenants</span>
                    </Link>
                    <Link to="/tenants/new" className="btn-primary">
                        <Plus className="h-4 w-4" />
                        New Tenant
                    </Link>
                </div>
            </div>

            {/* ── Alert: expiring trials ──────────────────────────────── */}
            {!isLoading && expiringSoon.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 dark:border-amber-700/30 dark:from-amber-900/20 dark:to-orange-900/15 animate-fade-in">
                    <div className="absolute right-0 top-0 h-full w-40 opacity-[0.06] bg-gradient-to-l from-amber-400 to-transparent pointer-events-none" />
                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 mt-0.5">
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
                                    {expiringSoon.length} trial{expiringSoon.length > 1 ? 's' : ''} expiring within 7 days
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {expiringSoon.map((t) => (
                                        <Link
                                            key={t.id}
                                            to={`/tenants/${t.id}`}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100/80 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition-all dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                                        >
                                            {t.name}
                                            <span className="font-normal opacity-70">
                                                · {t.trialDaysRemaining === 0 ? 'today' : `${t.trialDaysRemaining}d`}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <Link
                            to="/tenants?status=trial"
                            className="shrink-0 self-start rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 active:scale-[0.97] transition-all shadow-sm"
                        >
                            View all →
                        </Link>
                    </div>
                </div>
            )}

            {/* ── KPI cards ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xs:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                ) : (
                    <>
                        <KpiCard
                            label="Total Tenants"
                            value={total}
                            icon={<Layers className="h-5 w-5 text-slate-600 dark:text-slate-300" />}
                            iconBg="bg-slate-100 dark:bg-slate-800"
                            linkTo="/tenants"
                        />
                        <KpiCard
                            label="Active"
                            value={active}
                            sub={`${pct(active)}% of total`}
                            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
                            iconBg="bg-emerald-50 dark:bg-emerald-900/30"
                            linkTo="/tenants?status=active"
                        />
                        <KpiCard
                            label="On Trial"
                            value={trial}
                            sub={`${pct(trial)}% of total`}
                            icon={<Clock className="h-5 w-5 text-blue-600" />}
                            iconBg="bg-blue-50 dark:bg-blue-900/30"
                            linkTo="/tenants?status=trial"
                        />
                        <KpiCard
                            label="Expired"
                            value={expired}
                            sub={expired > 0 ? 'Need attention' : 'All clear'}
                            icon={<XCircle className="h-5 w-5 text-orange-500" />}
                            iconBg="bg-orange-50 dark:bg-orange-900/30"
                            linkTo="/tenants?status=expired"
                        />
                        <KpiCard
                            label="Suspended"
                            value={suspended}
                            icon={<Shield className="h-5 w-5 text-red-500" />}
                            iconBg="bg-red-50 dark:bg-red-900/30"
                            linkTo="/tenants?status=suspended"
                        />
                        <KpiCard
                            label="Inactive"
                            value={disabled + archived}
                            sub={`${disabled} disabled · ${archived} archived`}
                            icon={<Archive className="h-5 w-5 text-slate-400" />}
                            iconBg="bg-slate-100 dark:bg-slate-800"
                        />
                    </>
                )}
            </div>

            {/* ── Second row ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

                {/* Left column: Plan distribution + Status + Health */}
                <div className="card p-5 space-y-6">

                    {/* Plan distribution */}
                    <div>
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                                <BarChart3 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Plan Distribution</h2>
                        </div>

                        {isLoading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between">
                                            <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                            <div className="h-3 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                        </div>
                                        <div className="h-1.5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <PlanBar plan="Enterprise" count={byPlan('enterprise')} total={total} color="bg-violet-600" dotColor="bg-violet-500" />
                                <PlanBar plan="Pro" count={byPlan('pro')} total={total} color="bg-indigo-500" dotColor="bg-indigo-500" />
                                <PlanBar plan="Basic" count={byPlan('basic')} total={total} color="bg-blue-400" dotColor="bg-blue-400" />
                                <PlanBar plan="Trial" count={byPlan('trial')} total={total} color="bg-sky-400" dotColor="bg-sky-400" />
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800" />

                    {/* Status breakdown */}
                    <div>
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Status Breakdown
                        </p>
                        {isLoading ? (
                            <div className="grid grid-cols-3 gap-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                <StatusChip label="Active" value={active} textClass="text-emerald-700 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/20" />
                                <StatusChip label="Trial" value={trial} textClass="text-blue-700 dark:text-blue-400" bgClass="bg-blue-50 dark:bg-blue-900/20" />
                                <StatusChip label="Expired" value={expired} textClass="text-orange-600 dark:text-orange-400" bgClass="bg-orange-50 dark:bg-orange-900/20" />
                                <StatusChip label="Suspended" value={suspended} textClass="text-red-600 dark:text-red-400" bgClass="bg-red-50 dark:bg-red-900/20" />
                                <StatusChip label="Disabled" value={disabled} textClass="text-slate-600 dark:text-slate-400" bgClass="bg-slate-100 dark:bg-slate-800" />
                                <StatusChip label="Archived" value={archived} textClass="text-slate-500 dark:text-slate-500" bgClass="bg-slate-100 dark:bg-slate-800" />
                            </div>
                        )}
                    </div>

                    {/* Platform health */}
                    {!isLoading && total > 0 && (
                        <>
                            <div className="border-t border-slate-100 dark:border-slate-800" />
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        Platform Health
                                    </p>
                                    <span className={`text-sm font-extrabold tabular-nums ${healthScore >= 70 ? 'text-emerald-600 dark:text-emerald-400'
                                            : healthScore >= 40 ? 'text-amber-500'
                                                : 'text-red-500'
                                        }`}>
                                        {healthScore}%
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${healthScore >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                                : healthScore >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                                    : 'bg-gradient-to-r from-red-400 to-red-500'
                                            }`}
                                        style={{ width: `${healthScore}%` }}
                                    />
                                </div>
                                <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-600">
                                    Active & trial tenants as % of total
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Right column: Recently added */}
                <div className="card flex flex-col lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800/80">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                                <Activity className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recently Added</h2>
                        </div>
                        <Link
                            to="/tenants"
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 transition-all"
                        >
                            View all <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* Loading */}
                    {isLoading && (
                        <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/80">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <SkeletonListItem key={i} />
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && recent.length === 0 && (
                        <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                                <Building2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                            </div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No tenants yet</p>
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                Create your first tenant to get started
                            </p>
                            <Link to="/tenants/new" className="btn-primary mt-5">
                                <Plus className="h-4 w-4" />
                                Create Tenant
                            </Link>
                        </div>
                    )}

                    {/* List */}
                    {!isLoading && recent.length > 0 && (
                        <>
                            <ul className="flex-1 divide-y divide-slate-100/80 dark:divide-slate-800/60">
                                {recent.map((t, i) => (
                                    <li key={t.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-in">
                                        <Link
                                            to={`/tenants/${t.id}`}
                                            className="group flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            {/* Avatar */}
                                            <div
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm transition-shadow group-hover:shadow-md"
                                                style={{ backgroundColor: t.primaryColor ?? '#6366f1' }}
                                            >
                                                {t.name.charAt(0).toUpperCase()}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                                                    {t.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">/{t.slug}</span>
                                                    <span className="hidden text-[10px] text-slate-300 dark:text-slate-700 sm:inline">·</span>
                                                    <span className="hidden text-[11px] capitalize text-slate-400 sm:inline">{t.subscriptionPlan}</span>
                                                </div>
                                            </div>

                                            {/* Meta */}
                                            <div className="flex shrink-0 items-center gap-2.5">
                                                <StatusBadge status={t.status} trialDaysRemaining={t.trialDaysRemaining} />
                                                <span className="hidden text-[11px] text-slate-400 lg:block tabular-nums">
                                                    {new Date(t.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                                </span>
                                                <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors dark:text-slate-700" />
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>

                            {/* Footer CTA */}
                            <div className="border-t border-slate-100 dark:border-slate-800/80 p-3">
                                <Link
                                    to="/tenants/new"
                                    className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 transition-all"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add New Tenant
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

