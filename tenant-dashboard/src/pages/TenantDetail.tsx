import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Edit2, X, RefreshCw, CreditCard,
    Activity, Shield, AlertTriangle, Calendar, Clock,
    CheckCircle, XCircle, RotateCcw, Archive, Trash2,
    ChevronDown, ChevronUp, Plus, Zap, Ban, PlayCircle,
    Database, Users, ShoppingCart, HardDrive,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    useTenant,
    useTenantStats,
    useUpdateTenant,
    useActivateTenant,
    useDisableTenant,
    useDeleteTenant,
    useResetTenant,
    useSuspendTenant,
    useArchiveTenant,
    useUnarchiveTenant,
    useExtendTrial,
    useTenantActivity,
    useTenantPayments,
    useValidatePayment,
    useRejectPayment,
    useRefundPayment,
} from '../hooks/useTenants'
import { StatusBadge } from '../components/StatusBadge'
import { StatsCard } from '../components/StatsCard'
import { CopyableUrl } from '../components/CopyableUrl'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { TenantForm } from '../components/TenantForm'
import type { UpdateTenantInput, Payment } from '../types/tenant'

type Tab = 'overview' | 'subscription' | 'payments' | 'activity' | 'danger'

// ─────────────────────────────── helpers ─────────────────────────────────────

function trialDaysRemaining(endsAt: string | null): number | null {
    if (!endsAt) return null
    const diff = new Date(endsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / 86_400_000))
}

function formatDate(s: string | null) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(amount: number, currency = 'MAD') {
    return `${amount.toLocaleString()} ${currency}`
}

// ───────────────────────── sub-components ────────────────────────────────────

function UsageMeter({ label, used, max, icon }: { label: string; used: number; max: number; icon?: React.ReactNode }) {
    const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
    const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
    const textColor = pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-slate-500'
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    {icon && <span className="text-slate-400">{icon}</span>}
                    <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
                </div>
                <span className={`text-xs font-medium ${textColor} dark:opacity-80`}>{used.toLocaleString()} / {max.toLocaleString()}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                    className={`h-2 rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}

function PaymentStatusBadge({ status }: { status: Payment['status'] }) {
    const cfg: Record<Payment['status'], string> = {
        pending: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400',
        validated: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400',
        rejected: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400',
        refunded: 'bg-slate-100 text-slate-600 ring-slate-400/10 dark:bg-slate-800 dark:text-slate-400',
    }
    return (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}

function InlineModal({
    title,
    children,
    onClose,
}: {
    title: string
    children: React.ReactNode
    onClose: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

// ─────────────────────────────── main page ───────────────────────────────────

export function TenantDetail() {
    const { id } = useParams<{ id: string }>()
    const tenantId = Number(id)
    const navigate = useNavigate()

    const { data: tenant, isLoading, error } = useTenant(tenantId)
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useTenantStats(tenantId)
    const { data: activityData } = useTenantActivity(tenantId)
    const { data: paymentsData } = useTenantPayments(tenantId)

    const updateMutation = useUpdateTenant(tenantId)
    const activate = useActivateTenant()
    const disable = useDisableTenant()
    const softDelete = useDeleteTenant()
    const reset = useResetTenant()
    const suspend = useSuspendTenant()
    const archive = useArchiveTenant()
    const unarchive = useUnarchiveTenant()
    const extendTrial = useExtendTrial()
    const validatePayment = useValidatePayment()
    const rejectPayment = useRejectPayment()
    const refundPayment = useRefundPayment()

    const [activeTab, setActiveTab] = useState<Tab>('overview')
    const [editMode, setEditMode] = useState(false)
    const [dialog, setDialog] = useState<
        'activate' | 'disable' | 'suspend' | 'archive' | 'unarchive' | 'delete' | 'reset' | null
    >(null)
    const [confirmText, setConfirmText] = useState('')
    const [extendDays, setExtendDays] = useState(14)
    const [rejectReason, setRejectReason] = useState('')
    const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null)
    const [expandedPayment, setExpandedPayment] = useState<string | null>(null)

    const daysLeft = useMemo(
        () => (tenant ? trialDaysRemaining(tenant.trialEndsAt) : null),
        [tenant],
    )

    const handleUpdate = async (data: UpdateTenantInput) => {
        try {
            await updateMutation.mutateAsync(data)
            toast.success('Tenant updated')
            setEditMode(false)
        } catch {
            toast.error('Failed to update tenant')
        }
    }

    const handleConfirm = async () => {
        if (!tenant) return
        try {
            switch (dialog) {
                case 'activate':
                    await activate.mutateAsync({ id: tenantId })
                    toast.success('Tenant activated')
                    break
                case 'disable':
                    await disable.mutateAsync({ id: tenantId, reason: confirmText || 'Disabled by admin' })
                    toast.success('Tenant disabled')
                    break
                case 'suspend':
                    await suspend.mutateAsync({ id: tenantId, reason: confirmText || 'Suspended by admin' })
                    toast.success('Tenant suspended')
                    break
                case 'archive':
                    if (confirmText !== tenant.name) return
                    await archive.mutateAsync({ id: tenantId, confirmation: confirmText })
                    toast.success('Tenant archived')
                    break
                case 'unarchive':
                    await unarchive.mutateAsync(tenantId)
                    toast.success('Tenant restored')
                    break
                case 'delete':
                    if (confirmText !== `DELETE ${tenant.name}`) return
                    await softDelete.mutateAsync({ id: tenantId, confirmation: confirmText })
                    toast.success('Tenant deleted')
                    navigate('/tenants')
                    break
                case 'reset':
                    if (confirmText !== 'RESET') return
                    await reset.mutateAsync({ id: tenantId, confirmation: 'RESET' })
                    toast.success('Tenant data reset')
                    refetchStats()
                    break
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Operation failed'
            toast.error(msg)
        } finally {
            setDialog(null)
            setConfirmText('')
        }
    }

    const closeDialog = () => { setDialog(null); setConfirmText('') }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
        )
    }

    if (error || !tenant) {
        return (
            <div className="p-8">
                <p className="text-sm text-red-500">Tenant not found or failed to load.</p>
                <button onClick={() => navigate('/tenants')} className="mt-3 text-sm text-slate-600 underline">
                    Back to tenants
                </button>
            </div>
        )
    }

    const urls = {
        admin: `https://${tenant.slug}-admin.mar-nova.com`,
        client: `https://${tenant.slug}-app.mar-nova.com`,
        delivery: `https://${tenant.slug}-delivery.mar-nova.com`,
    }

    const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'overview', label: 'Overview', icon: <Shield className="h-4 w-4" /> },
        { key: 'subscription', label: 'Subscription', icon: <CreditCard className="h-4 w-4" /> },
        { key: 'payments', label: 'Payments', icon: <Calendar className="h-4 w-4" /> },
        { key: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
        { key: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="h-4 w-4" /> },
    ]

    const isLocked = tenant.status === 'archived' || tenant.status === 'deleted'
    const canActivate = ['disabled', 'suspended', 'expired'].includes(tenant.status)
    const canDisable = ['active', 'trial'].includes(tenant.status)

    const PLAN_COLORS: Record<string, string> = {
        starter: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
        growth: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
        pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        enterprise: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    }
    const planColor = PLAN_COLORS[tenant.subscriptionPlan?.toLowerCase()] ?? 'bg-slate-100 text-slate-700'

    return (
        <div className="animate-fade-in space-y-6 p-6 lg:p-8">

            {/* ── Page Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <button
                        onClick={() => navigate('/tenants')}
                        className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to tenants
                    </button>
                    <div className="flex items-center gap-4">
                        <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg"
                            style={{ backgroundColor: tenant.primaryColor ?? '#6366f1' }}
                        >
                            {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tenant.name}</h1>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <code className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {tenant.slug}
                                </code>
                                <StatusBadge status={tenant.status} trialDaysRemaining={daysLeft} />
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${planColor}`}>
                                    {tenant.subscriptionPlan}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick action buttons */}
                {!isLocked && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {canActivate && (
                            <button
                                onClick={() => setDialog('activate')}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                            >
                                <PlayCircle className="h-4 w-4" />
                                Activate
                            </button>
                        )}
                        {canDisable && (
                            <button
                                onClick={() => setDialog('disable')}
                                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-600 active:scale-95"
                            >
                                <Ban className="h-4 w-4" />
                                Disable
                            </button>
                        )}
                        <button
                            onClick={() => setEditMode((e) => !e)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            {editMode ? <><X className="h-4 w-4" /> Cancel</> : <><Edit2 className="h-4 w-4" /> Edit</>}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Edit Form ── */}
            {editMode && (
                <div className="card animate-fade-in">
                    <h2 className="mb-5 text-base font-semibold text-slate-900 dark:text-slate-100">Edit Tenant</h2>
                    <TenantForm onSubmit={handleUpdate} loading={updateMutation.isPending} initial={tenant} editMode />
                </div>
            )}

            {/* ── Trial Expiry Banner ── */}
            {tenant.status === 'trial' && daysLeft !== null && daysLeft <= 3 && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
                    <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-red-500" />
                    <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                            Trial {daysLeft === 0 ? 'ends today!' : `expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`}
                        </p>
                        <p className="mt-0.5 text-xs text-red-600 dark:text-red-500">
                            Go to the Subscription tab to extend the trial or activate.
                        </p>
                    </div>
                    <button
                        onClick={() => setActiveTab('subscription')}
                        className="ml-auto shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                    >
                        Manage
                    </button>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex gap-0.5 overflow-x-auto">
                    {TABS.map((tab) => {
                        const active = activeTab === tab.key
                        const isDanger = tab.key === 'danger'
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={[
                                    'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                                    active && !isDanger
                                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                        : active && isDanger
                                            ? 'border-red-500 text-red-500'
                                            : isDanger
                                                ? 'border-transparent text-red-400 hover:text-red-500 dark:text-red-500'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                                    !active && !isDanger ? 'hover:border-slate-300' : '',
                                ].join(' ')}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        )
                    })}
                </nav>
            </div>

            {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Info grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            { label: 'Contact Name', value: tenant.contactName ?? '—' },
                            { label: 'Contact Email', value: tenant.contactEmail ?? '—' },
                            { label: 'Contact Phone', value: tenant.contactPhone ?? '—' },
                            { label: 'Database', value: tenant.databaseName },
                            { label: 'Created', value: formatDate(tenant.createdAt) },
                            { label: 'Last Status Change', value: formatDate(tenant.statusChangedAt) },
                            ...(tenant.statusReason ? [{ label: 'Status Reason', value: tenant.statusReason }] : []),
                        ].map(({ label, value }) => (
                            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
                                <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Portal URLs */}
                    <div className="card">
                        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            <Zap className="h-4 w-4 text-indigo-500" />
                            Portal URLs
                        </h2>
                        <div className="space-y-2">
                            {Object.entries(urls).map(([key, url]) => (
                                <CopyableUrl key={key} label={key} value={url} href={url} />
                            ))}
                        </div>
                    </div>

                    {/* Live Stats */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                <Database className="h-4 w-4 text-indigo-500" />
                                Live Stats
                            </h2>
                            <button
                                onClick={() => refetchStats()}
                                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                                <RefreshCw className="h-3.5 w-3.5" /> Refresh
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            {statsLoading
                                ? Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                                ))
                                : stats
                                    ? <>
                                        <StatsCard label="Users" value={stats.usersCount} />
                                        <StatsCard label="Orders" value={stats.ordersCount} />
                                        <StatsCard label="DB Size" value={stats.dbSizeHuman} />
                                        <StatsCard label="Storage Used" value={stats.storageUsedHuman} />
                                    </>
                                    : <p className="col-span-4 text-sm text-slate-400">Could not load stats.</p>
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ SUBSCRIPTION TAB ══════════════════ */}
            {activeTab === 'subscription' && (
                <div className="space-y-6">
                    {/* Trial info */}
                    {tenant.status === 'trial' && (
                        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:border-blue-800/50 dark:from-blue-900/20 dark:to-indigo-900/20">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        <h3 className="text-base font-semibold text-blue-800 dark:text-blue-300">Trial Period</h3>
                                    </div>
                                    <p className={`mt-1 text-2xl font-bold ${daysLeft === 0 ? 'text-red-600' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-600' : 'text-blue-700 dark:text-blue-300'}`}>
                                        {daysLeft === null ? '—' : daysLeft === 0 ? 'Ends today!' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                                    </p>
                                    <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                                        {formatDate(tenant.trialStartedAt)} → {formatDate(tenant.trialEndsAt)}
                                    </p>
                                    {/* Progress bar */}
                                    {tenant.trialDays > 0 && daysLeft !== null && (
                                        <div className="mt-3">
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/40">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-700 ${daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.round((daysLeft / tenant.trialDays) * 100)}%` }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-blue-500 dark:text-blue-500">
                                                {Math.round((daysLeft / tenant.trialDays) * 100)}% of trial remaining
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Extend trial */}
                            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-blue-200 pt-4 dark:border-blue-800/40">
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Extend by:</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={90}
                                    value={extendDays}
                                    onChange={(e) => setExtendDays(Number(e.target.value))}
                                    className="w-20 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm dark:border-blue-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                                <span className="text-sm text-blue-600 dark:text-blue-400">days</span>
                                <button
                                    onClick={async () => {
                                        try {
                                            await extendTrial.mutateAsync({ id: tenantId, additionalDays: extendDays })
                                            toast.success(`Trial extended by ${extendDays} days`)
                                        } catch {
                                            toast.error('Failed to extend trial')
                                        }
                                    }}
                                    disabled={extendTrial.isPending}
                                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {extendTrial.isPending ? 'Extending…' : 'Extend Trial'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Subscription dates */}
                    <div className="card">
                        <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            <CreditCard className="h-4 w-4 text-indigo-500" />
                            Subscription Details
                        </h3>
                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                            {[
                                { label: 'Plan', value: <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${planColor}`}>{tenant.subscriptionPlan}</span> },
                                { label: 'Started', value: formatDate(tenant.subscriptionStartedAt) },
                                { label: 'Expires', value: formatDate(tenant.subscriptionEndsAt) },
                                { label: 'Auto Renew', value: tenant.autoRenew ? '✓ Enabled' : '✗ Disabled' },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
                                    <div className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Plan Limits + Usage */}
                    <div className="card">
                        <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            <Shield className="h-4 w-4 text-indigo-500" />
                            Plan Limits & Usage
                        </h3>
                        <div className="space-y-5">
                            <UsageMeter
                                label="Users"
                                used={stats?.usersCount ?? 0}
                                max={tenant.maxUsers}
                                icon={<Users className="h-3.5 w-3.5" />}
                            />
                            <UsageMeter
                                label="Orders / month"
                                used={stats?.ordersCount ?? 0}
                                max={tenant.maxOrdersPerMonth}
                                icon={<ShoppingCart className="h-3.5 w-3.5" />}
                            />
                            <UsageMeter
                                label="Storage (MB)"
                                used={stats ? Math.round(stats.storageUsedBytes / (1024 * 1024)) : 0}
                                max={tenant.maxStorageMb}
                                icon={<HardDrive className="h-3.5 w-3.5" />}
                            />
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-4">
                            {[
                                { label: 'Max Users', value: tenant.maxUsers },
                                { label: 'Max Products', value: tenant.maxProducts },
                                { label: 'Max Orders/mo', value: tenant.maxOrdersPerMonth },
                                { label: 'Storage (MB)', value: tenant.maxStorageMb },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
                                    <p className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-100">{value.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ PAYMENTS TAB ══════════════════ */}
            {activeTab === 'payments' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Payment History</h2>
                        <button
                            onClick={() => toast('Payment recording coming soon')}
                            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3"
                        >
                            <Plus className="h-3.5 w-3.5" /> Record Payment
                        </button>
                    </div>

                    {!paymentsData || paymentsData.length === 0 ? (
                        <div className="card flex flex-col items-center gap-3 py-12 text-center">
                            <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm text-slate-400">No payments recorded yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                                        {['Date', 'Plan', 'Amount', 'Method', 'Period', 'Status', ''].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/50 dark:bg-slate-900">
                                    {paymentsData.map((p: Payment) => (
                                        <>
                                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.createdAt)}</td>
                                                <td className="px-4 py-3 text-xs font-medium capitalize text-slate-700 dark:text-slate-300">
                                                    {p.planName} <span className="text-slate-400">({p.billingCycle})</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(p.amount, p.currency)}</td>
                                                <td className="px-4 py-3 text-xs capitalize text-slate-500">{p.paymentMethod?.replace('_', ' ') ?? '—'}</td>
                                                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.periodStart)} → {formatDate(p.periodEnd)}</td>
                                                <td className="px-4 py-3"><PaymentStatusBadge status={p.status} /></td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => setExpandedPayment(expandedPayment === p.id ? null : p.id)}
                                                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                                                    >
                                                        {expandedPayment === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedPayment === p.id && (
                                                <tr key={`${p.id}-expanded`} className="bg-slate-50/80 dark:bg-slate-800/30">
                                                    <td colSpan={7} className="px-4 py-4">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            {p.referenceNumber && (
                                                                <span className="text-xs text-slate-500">
                                                                    Ref: <strong className="text-slate-700 dark:text-slate-300">{p.referenceNumber}</strong>
                                                                </span>
                                                            )}
                                                            {p.notes && <span className="text-xs italic text-slate-500">{p.notes}</span>}
                                                            {p.status === 'pending' && (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            validatePayment
                                                                                .mutateAsync({ paymentId: p.id, tenantId })
                                                                                .then(() => toast.success('Payment validated'))
                                                                                .catch(() => toast.error('Failed'))
                                                                        }
                                                                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                                                                    >
                                                                        <CheckCircle className="h-3 w-3" /> Validate
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setRejectPaymentId(p.id)}
                                                                        className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20"
                                                                    >
                                                                        <XCircle className="h-3 w-3" /> Reject
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {p.status === 'validated' && (
                                                                <button
                                                                    onClick={() =>
                                                                        refundPayment
                                                                            .mutateAsync({ paymentId: p.id, tenantId })
                                                                            .then(() => toast.success('Payment refunded'))
                                                                            .catch(() => toast.error('Failed'))
                                                                    }
                                                                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                                                >
                                                                    <RotateCcw className="h-3 w-3" /> Refund
                                                                </button>
                                                            )}
                                                            {rejectPaymentId === p.id && (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        placeholder="Rejection reason…"
                                                                        value={rejectReason}
                                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                                                    />
                                                                    <button
                                                                        onClick={() =>
                                                                            rejectPayment
                                                                                .mutateAsync({ paymentId: p.id, tenantId, reason: rejectReason })
                                                                                .then(() => { toast.success('Rejected'); setRejectPaymentId(null); setRejectReason('') })
                                                                                .catch(() => toast.error('Failed'))
                                                                        }
                                                                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                                                                    >
                                                                        Confirm
                                                                    </button>
                                                                    <button onClick={() => setRejectPaymentId(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════ ACTIVITY TAB ══════════════════ */}
            {activeTab === 'activity' && (
                <div>
                    {!activityData || activityData.length === 0 ? (
                        <div className="card flex flex-col items-center gap-3 py-12 text-center">
                            <Activity className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm text-slate-400">No activity recorded yet.</p>
                        </div>
                    ) : (
                        <div className="relative pl-8">
                            <div className="absolute left-3 top-2 bottom-2 w-0.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                            {activityData.map((entry) => {
                                const actionColor =
                                    entry.action.includes('delete') || entry.action.includes('suspend') || entry.action.includes('reset')
                                        ? 'bg-red-500 ring-red-100 dark:ring-red-900/40'
                                        : entry.action.includes('activat') || entry.action.includes('unarchive')
                                            ? 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/40'
                                            : entry.action.includes('disable') || entry.action.includes('archive')
                                                ? 'bg-amber-500 ring-amber-100 dark:ring-amber-900/40'
                                                : 'bg-indigo-500 ring-indigo-100 dark:ring-indigo-900/40'
                                return (
                                    <div key={entry.id} className="relative mb-4">
                                        <div className={`absolute -left-5 top-2 h-2.5 w-2.5 rounded-full ring-4 ${actionColor}`} />
                                        <div className="card p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">
                                                    {entry.action.replace(/_/g, ' ')}
                                                </span>
                                                <span className="shrink-0 text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>
                                            </div>
                                            {entry.performedBy && (
                                                <p className="mt-0.5 text-xs text-slate-500">by {entry.performedBy}</p>
                                            )}
                                            {entry.details && Object.keys(entry.details).length > 0 && (
                                                <pre className="mt-2 overflow-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                    {JSON.stringify(entry.details, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════ DANGER ZONE TAB ══════════════════ */}
            {activeTab === 'danger' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-900/10">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">
                            Actions in this section may be irreversible. Proceed with caution.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {/* Activate */}
                        {canActivate && (
                            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-800/40 dark:bg-slate-900">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <PlayCircle className="h-4 w-4 text-emerald-600" />
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Activate Tenant</p>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">Re-enable this tenant and restore full access.</p>
                                </div>
                                <button onClick={() => setDialog('activate')} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700">
                                    Activate
                                </button>
                            </div>
                        )}

                        {/* Disable */}
                        {canDisable && (
                            <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-800/40 dark:bg-slate-900">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Ban className="h-4 w-4 text-amber-600" />
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Disable Tenant</p>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">All requests will receive a 403 until re-activated.</p>
                                </div>
                                <button onClick={() => setDialog('disable')} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                    Disable
                                </button>
                            </div>
                        )}

                        {/* Suspend */}
                        {canDisable && (
                            <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-800/40 dark:bg-slate-900">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Suspend Tenant</p>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">Block access pending investigation or overdue payment.</p>
                                </div>
                                <button onClick={() => setDialog('suspend')} className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
                                    Suspend
                                </button>
                            </div>
                        )}

                        {/* Archive / Unarchive */}
                        {tenant.status !== 'archived' && tenant.status !== 'deleted' && (
                            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Archive className="h-4 w-4 text-slate-500" />
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Archive Tenant</p>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">Closes the DB connection. Can be unarchived later.</p>
                                </div>
                                <button onClick={() => setDialog('archive')} className="btn-secondary text-xs py-2 px-4">
                                    Archive
                                </button>
                            </div>
                        )}
                        {tenant.status === 'archived' && (
                            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-800/40 dark:bg-slate-900">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Unarchive Tenant</p>
                                    <p className="mt-0.5 text-xs text-slate-500">Restore access — tenant returns to active status.</p>
                                </div>
                                <button onClick={() => setDialog('unarchive')} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                                    Unarchive
                                </button>
                            </div>
                        )}

                        <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

                        {/* Reset Data */}
                        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm dark:border-red-900/40 dark:bg-red-900/10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4 text-red-500" />
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">Reset Tenant Data</p>
                                </div>
                                <p className="mt-0.5 text-xs text-red-600 dark:text-red-500">Drops and re-provisions the database. All data will be lost permanently.</p>
                            </div>
                            <button onClick={() => setDialog('reset')} className="rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-slate-900 dark:text-red-400">
                                Reset Data
                            </button>
                        </div>

                        {/* Permanent Delete */}
                        {tenant.status !== 'deleted' && (
                            <div className="flex items-center justify-between rounded-2xl border-2 border-red-400 bg-red-50 p-5 shadow-sm dark:border-red-700 dark:bg-red-950/20">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Delete Permanently</p>
                                    </div>
                                    <p className="mt-0.5 text-xs text-red-600 dark:text-red-500">
                                        Destroys the DB, MinIO bucket, and Redis keys for <strong>{tenant.name}</strong>. Irreversible.
                                    </p>
                                </div>
                                <button onClick={() => setDialog('delete')} className="btn-danger text-xs py-2 px-4">
                                    Delete Forever
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════ CONFIRM DIALOGS ══════════════════ */}
            <ConfirmDialog
                open={dialog === 'activate'}
                title="Activate tenant?"
                description={`"${tenant.name}" will be re-enabled and accept requests again.`}
                confirmLabel="Activate"
                confirmVariant="default"
                onConfirm={handleConfirm}
                onCancel={closeDialog}
                loading={activate.isPending}
            />
            <ConfirmDialog
                open={dialog === 'unarchive'}
                title="Unarchive tenant?"
                description={`"${tenant.name}" will be restored to active status.`}
                confirmLabel="Unarchive"
                confirmVariant="default"
                onConfirm={handleConfirm}
                onCancel={closeDialog}
                loading={unarchive.isPending}
            />

            {/* Disable */}
            {dialog === 'disable' && (
                <InlineModal title="Disable tenant?" onClose={closeDialog}>
                    <p className="mb-3 text-sm text-slate-500">All requests to <strong>{tenant.name}</strong> will return 403. Optionally provide a reason.</p>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Reason (optional)"
                        className="input"
                    />
                    <div className="mt-4 flex justify-end gap-3">
                        <button onClick={closeDialog} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleConfirm} disabled={disable.isPending} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                            {disable.isPending ? 'Disabling…' : 'Disable'}
                        </button>
                    </div>
                </InlineModal>
            )}

            {/* Suspend */}
            {dialog === 'suspend' && (
                <InlineModal title="Suspend tenant?" onClose={closeDialog}>
                    <p className="mb-3 text-sm text-slate-500">Temporarily block all access to <strong>{tenant.name}</strong>. Optionally provide a reason.</p>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Reason (optional)"
                        className="input"
                    />
                    <div className="mt-4 flex justify-end gap-3">
                        <button onClick={closeDialog} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleConfirm} disabled={suspend.isPending} className="btn-danger text-sm">
                            {suspend.isPending ? 'Suspending…' : 'Suspend'}
                        </button>
                    </div>
                </InlineModal>
            )}

            {/* Archive */}
            {dialog === 'archive' && (
                <InlineModal title="Archive tenant?" onClose={closeDialog}>
                    <p className="mb-3 text-sm text-slate-500">
                        The DB connection will be closed. Type <strong className="text-slate-800 dark:text-slate-200">{tenant.name}</strong> to confirm.
                    </p>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={tenant.name}
                        className="input"
                    />
                    <div className="mt-4 flex justify-end gap-3">
                        <button onClick={closeDialog} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleConfirm} disabled={confirmText !== tenant.name || archive.isPending} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                            {archive.isPending ? 'Archiving…' : 'Archive'}
                        </button>
                    </div>
                </InlineModal>
            )}

            {/* Delete */}
            {dialog === 'delete' && (
                <InlineModal title="Permanently delete tenant?" onClose={closeDialog}>
                    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-900/20">
                        <p className="text-sm text-red-700 dark:text-red-400">
                            This will destroy the database, MinIO bucket, and Redis keys for <strong>{tenant.name}</strong>. This action is <strong>irreversible</strong>.
                        </p>
                    </div>
                    <p className="mb-2 text-sm text-slate-500">
                        Type <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">DELETE {tenant.name}</code> to confirm.
                    </p>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={`DELETE ${tenant.name}`}
                        className="input font-mono"
                    />
                    <div className="mt-4 flex justify-end gap-3">
                        <button onClick={closeDialog} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleConfirm} disabled={confirmText !== `DELETE ${tenant.name}` || softDelete.isPending} className="btn-danger text-sm disabled:opacity-50">
                            {softDelete.isPending ? 'Deleting…' : 'Delete Forever'}
                        </button>
                    </div>
                </InlineModal>
            )}

            {/* Reset */}
            {dialog === 'reset' && (
                <InlineModal title="Reset tenant data?" onClose={closeDialog}>
                    <p className="mb-3 text-sm text-slate-500">
                        Drops and re-provisions the database for <strong>{tenant.name}</strong>. All data will be permanently lost.
                        Type <strong>RESET</strong> to confirm.
                    </p>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="RESET"
                        className="input font-mono"
                    />
                    <div className="mt-4 flex justify-end gap-3">
                        <button onClick={closeDialog} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleConfirm} disabled={confirmText !== 'RESET' || reset.isPending} className="btn-danger text-sm disabled:opacity-50">
                            {reset.isPending ? 'Resetting…' : 'Reset Data'}
                        </button>
                    </div>
                </InlineModal>
            )}
        </div>
    )
}
