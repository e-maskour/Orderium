import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, SlidersHorizontal, X, Download } from 'lucide-react'
import { useTenants } from '../hooks/useTenants'
import { TenantTable } from '../components/TenantTable'
import { SearchBar } from '../components/SearchBar'
import { Pagination } from '../components/Pagination'
import type { ListTenantsParams } from '../types/tenant'

const STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'trial', label: 'Trial' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'archived', label: 'Archived' },
    { value: 'deleted', label: 'Deleted' },
] as const

const PLAN_OPTIONS = [
    { value: 'all', label: 'All plans' },
    { value: 'trial', label: 'Trial' },
    { value: 'basic', label: 'Basic' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
] as const

const SORT_OPTIONS = [
    { value: 'createdAt', label: 'Date created' },
    { value: 'name', label: 'Name' },
    { value: 'subscriptionPlan', label: 'Plan' },
] as const

const STATUS_COLORS: Record<string, string> = {
    trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    disabled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    archived: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    deleted: 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    all: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export function TenantsList() {
    const [searchParams] = useSearchParams()
    const presetStatus = searchParams.get('status') as ListTenantsParams['status'] | null

    const [params, setParams] = useState<ListTenantsParams>({
        page: 1,
        limit: 20,
        status: presetStatus ?? 'all',
        plan: 'all',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        search: '',
    })
    const [filtersOpen, setFiltersOpen] = useState(false)

    const { data, isLoading } = useTenants(params)

    const set = <K extends keyof ListTenantsParams>(key: K, value: ListTenantsParams[K]) =>
        setParams((p) => ({ ...p, [key]: value, page: 1 }))

    const activeFilterCount = [
        params.status !== 'all',
        params.plan !== 'all',
        !!params.search,
    ].filter(Boolean).length

    const clearFilters = () =>
        setParams((p) => ({ ...p, status: 'all', plan: 'all', search: '', page: 1 }))

    const selectClass =
        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'

    return (
        <div className="px-8 py-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tenants</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {data
                            ? `${data.total} tenant${data.total !== 1 ? 's' : ''} — page ${data.page} of ${data.totalPages || 1}`
                            : 'Loading…'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFiltersOpen((o) => !o)}
                        className={`btn-secondary flex items-center gap-2 ${activeFilterCount > 0 ? 'ring-2 ring-indigo-500/30 border-indigo-300 dark:border-indigo-600' : ''}`}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <Link
                        to="/tenants/new"
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Tenant
                    </Link>
                </div>
            </div>

            {/* Status quick-filter chips */}
            <div className="flex flex-wrap items-center gap-2">
                {STATUS_OPTIONS.map((o) => (
                    <button
                        key={o.value}
                        onClick={() => set('status', o.value as ListTenantsParams['status'])}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${params.status === o.value
                                ? STATUS_COLORS[o.value] + ' ring-2 ring-offset-1 ring-current/30'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                            }`}
                    >
                        {o.label}
                    </button>
                ))}
                {activeFilterCount > 0 && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition"
                    >
                        <X className="h-3 w-3" />
                        Clear filters
                    </button>
                )}
            </div>

            {/* Expanded filters */}
            {filtersOpen && (
                <div className="card p-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {/* Search */}
                        <div className="sm:col-span-2">
                            <label className="label">Search</label>
                            <SearchBar
                                value={params.search ?? ''}
                                onChange={(v) => set('search', v)}
                                placeholder="Name or slug…"
                            />
                        </div>
                        {/* Plan */}
                        <div>
                            <label className="label">Plan</label>
                            <select
                                value={params.plan}
                                onChange={(e) => set('plan', e.target.value as ListTenantsParams['plan'])}
                                className={selectClass}
                            >
                                {PLAN_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        {/* Sort */}
                        <div>
                            <label className="label">Sort by</label>
                            <div className="flex gap-2">
                                <select
                                    value={params.sortBy}
                                    onChange={(e) => set('sortBy', e.target.value as ListTenantsParams['sortBy'])}
                                    className={selectClass}
                                >
                                    {SORT_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => set('sortOrder', params.sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                                    className="btn-secondary px-3 shrink-0"
                                    title={params.sortOrder === 'ASC' ? 'Ascending' : 'Descending'}
                                >
                                    {params.sortOrder === 'ASC' ? '↑' : '↓'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <TenantTable tenants={data?.data ?? []} loading={isLoading} />

            {/* Pagination */}
            {data && data.totalPages > 1 && (
                <Pagination
                    page={data.page}
                    totalPages={data.totalPages}
                    total={data.total}
                    limit={data.limit}
                    onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
                />
            )}
        </div>
    )
}

