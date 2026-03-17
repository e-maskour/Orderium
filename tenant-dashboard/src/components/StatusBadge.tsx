import type { TenantStatus } from '../types/tenant'

const CONFIG: Record<TenantStatus, { label: string; dot: string; badge: string }> = {
    trial: {
        label: 'Trial',
        dot: 'bg-blue-500',
        badge: 'bg-blue-50 text-blue-700 ring-blue-600/10 dark:bg-blue-900/30 dark:text-blue-400',
    },
    active: {
        label: 'Active',
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    expired: {
        label: 'Expired',
        dot: 'bg-orange-500',
        badge: 'bg-orange-50 text-orange-700 ring-orange-600/10 dark:bg-orange-900/30 dark:text-orange-400',
    },
    suspended: {
        label: 'Suspended',
        dot: 'bg-red-500',
        badge: 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/30 dark:text-red-400',
    },
    disabled: {
        label: 'Disabled',
        dot: 'bg-amber-400',
        badge: 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-900/30 dark:text-amber-400',
    },
    archived: {
        label: 'Archived',
        dot: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-500 ring-slate-400/10 dark:bg-slate-800 dark:text-slate-400',
    },
    deleted: {
        label: 'Deleted',
        dot: 'bg-red-800',
        badge: 'bg-red-50 text-red-800 ring-red-800/10 dark:bg-red-900/30 dark:text-red-300',
    },
}

interface Props {
    status: TenantStatus
    trialDaysRemaining?: number | null
    className?: string
}

export function StatusBadge({ status, trialDaysRemaining, className = '' }: Props) {
    const cfg = CONFIG[status] ?? CONFIG.disabled

    const label =
        status === 'trial' && trialDaysRemaining != null
            ? trialDaysRemaining === 0
                ? 'Trial — ends today!'
                : `Trial — ${trialDaysRemaining}d left`
            : cfg.label

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cfg.badge} ${className}`}
        >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
            {label}
        </span>
    )
}
