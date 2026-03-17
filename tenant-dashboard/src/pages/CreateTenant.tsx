import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft, CheckCircle, Copy, ExternalLink,
    Building2, CreditCard, Settings, Eye,
    ChevronRight, ChevronLeft, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCreateTenant } from '../hooks/useTenants'
import { slugify } from '../utils/slugify'
import type { CreateTenantInput, CreateTenantResponse } from '../types/tenant'

// ─────────────────────────────── Wizard Steps ─────────────────────────────────

const WIZARD_STEPS = [
    { id: 1, label: 'Basic Info', icon: <Building2 className="h-4 w-4" /> },
    { id: 2, label: 'Subscription', icon: <CreditCard className="h-4 w-4" /> },
    { id: 3, label: 'Limits', icon: <Settings className="h-4 w-4" /> },
    { id: 4, label: 'Review', icon: <Eye className="h-4 w-4" /> },
]

const PROVISIONING_STEPS = [
    'Creating database…',
    'Running migrations…',
    'Creating storage bucket…',
    'Configuring cache…',
    'Finalizing tenant…',
]

const PLANS = [
    {
        value: 'basic',
        label: 'Basic',
        price: 'Starting plan',
        color: 'indigo',
        features: ['Up to 10 users', '1,000 products', '500 orders/mo', '2 GB storage'],
    },
    {
        value: 'pro',
        label: 'Pro',
        price: 'Most popular',
        color: 'violet',
        features: ['Up to 50 users', '10,000 products', '5,000 orders/mo', '20 GB storage'],
    },
    {
        value: 'enterprise',
        label: 'Enterprise',
        price: 'Full power',
        color: 'purple',
        features: ['Unlimited users', 'Unlimited products', 'Unlimited orders', '100 GB storage'],
    },
] as const

type FormData = {
    // Step 1
    name: string
    slug: string
    contactName: string
    contactEmail: string
    contactPhone: string
    address: string
    primaryColor: string
    logoUrl: string
    // Step 2
    subscriptionPlan: 'basic' | 'pro' | 'enterprise'
    trialDays: number
    // Step 3
    maxUsers: number
    maxProducts: number
    maxOrdersPerMonth: number
    maxStorageMb: number
    // Internal
    notes: string
}

const DEFAULTS: FormData = {
    name: '',
    slug: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    primaryColor: '#6366f1',
    logoUrl: '',
    subscriptionPlan: 'basic',
    trialDays: 14,
    maxUsers: 10,
    maxProducts: 1000,
    maxOrdersPerMonth: 500,
    maxStorageMb: 2048,
    notes: '',
}

const PLAN_DEFAULTS: Record<string, Partial<FormData>> = {
    basic: { maxUsers: 10, maxProducts: 1000, maxOrdersPerMonth: 500, maxStorageMb: 2048 },
    pro: { maxUsers: 50, maxProducts: 10000, maxOrdersPerMonth: 5000, maxStorageMb: 20480 },
    enterprise: { maxUsers: 9999, maxProducts: 99999, maxOrdersPerMonth: 99999, maxStorageMb: 102400 },
}

// ─────────────────────────────── Success Screen ───────────────────────────────

function SuccessScreen({ created, onCreateAnother, onView }: {
    created: CreateTenantResponse
    onCreateAnother: () => void
    onView: () => void
}) {
    const copyUrl = async (url: string) => {
        await navigator.clipboard.writeText(url)
        toast.success('Copied to clipboard')
    }

    return (
        <div className="flex flex-col items-center py-8 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 shadow-sm">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Tenant Created!
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-200">{created.name}</strong> has been provisioned and is ready to use.
            </p>

            <div className="mt-8 w-full max-w-lg space-y-2">
                <p className="mb-2 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">Portal URLs</p>
                {Object.entries(created.urls).map(([key, url]) => (
                    <div
                        key={key}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                        <div className="text-left min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 capitalize">{key} Portal</p>
                            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{url}</p>
                        </div>
                        <div className="ml-4 flex shrink-0 gap-1">
                            <button
                                onClick={() => copyUrl(url)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
                                aria-label="Copy URL"
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
                                aria-label="Open URL"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex w-full max-w-lg gap-3">
                <button
                    onClick={onView}
                    className="flex-1 btn-primary py-2.5"
                >
                    View Tenant
                </button>
                <button
                    onClick={onCreateAnother}
                    className="flex-1 btn-secondary py-2.5"
                >
                    Create Another
                </button>
            </div>
        </div>
    )
}

// ─────────────────────────────── Main Component ───────────────────────────────

export function CreateTenant() {
    const navigate = useNavigate()
    const { mutateAsync, isPending } = useCreateTenant()
    const [step, setStep] = useState(1)
    const [provisionStep, setProvisionStep] = useState(0)
    const [form, setForm] = useState<FormData>(DEFAULTS)
    const [slugEdited, setSlugEdited] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
    const [created, setCreated] = useState<CreateTenantResponse | null>(null)

    const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm((f) => ({ ...f, [key]: value }))
        setErrors((e) => ({ ...e, [key]: undefined }))
    }

    // Auto-slug from name
    const handleNameChange = (value: string) => {
        set('name', value)
        if (!slugEdited) {
            setForm((f) => ({ ...f, name: value, slug: slugify(value) }))
        }
    }

    const handlePlanSelect = (plan: 'basic' | 'pro' | 'enterprise') => {
        set('subscriptionPlan', plan)
        const defaults = PLAN_DEFAULTS[plan]
        setForm((f) => ({ ...f, subscriptionPlan: plan, ...defaults }))
    }

    const validateStep = (s: number): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {}
        if (s === 1) {
            if (!form.name.trim()) newErrors.name = 'Name is required'
            if (!form.slug.trim()) {
                newErrors.slug = 'Slug is required'
            } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(form.slug)) {
                newErrors.slug = 'Lowercase letters, digits and hyphens only (min 2 chars)'
            }
            if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
                newErrors.contactEmail = 'Invalid email address'
            }
        }
        if (s === 3) {
            if (form.maxUsers < 1) newErrors.maxUsers = 'Must be at least 1'
            if (form.maxProducts < 1) newErrors.maxProducts = 'Must be at least 1'
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const nextStep = () => {
        if (!validateStep(step)) return
        setStep((s) => Math.min(s + 1, 4))
    }

    const handleSubmit = async () => {
        if (!validateStep(step)) return

        let idx = 0
        const interval = setInterval(() => {
            idx = Math.min(idx + 1, PROVISIONING_STEPS.length - 1)
            setProvisionStep(idx)
        }, 700)

        const input: CreateTenantInput = {
            name: form.name.trim(),
            slug: form.slug.trim(),
            ...(form.contactName && { contactName: form.contactName }),
            ...(form.contactEmail && { contactEmail: form.contactEmail }),
            ...(form.contactPhone && { contactPhone: form.contactPhone }),
            ...(form.address && { address: form.address }),
            ...(form.notes && { notes: form.notes }),
            ...(form.primaryColor && { primaryColor: form.primaryColor }),
            ...(form.logoUrl && { logoUrl: form.logoUrl }),
            subscriptionPlan: form.subscriptionPlan,
            trialDays: form.trialDays,
            maxUsers: form.maxUsers,
        }

        try {
            const result = await mutateAsync(input)
            clearInterval(interval)
            setProvisionStep(PROVISIONING_STEPS.length)
            setCreated(result)
            toast.success(`Tenant "${result.name}" created!`)
        } catch (err: unknown) {
            clearInterval(interval)
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Failed to create tenant'
            toast.error(message)
            setProvisionStep(0)
        }
    }

    if (created) {
        return (
            <div className="px-8 py-8">
                <div className="mx-auto max-w-2xl">
                    <SuccessScreen
                        created={created}
                        onView={() => navigate(`/tenants/${created.id}`)}
                        onCreateAnother={() => {
                            setCreated(null)
                            setForm(DEFAULTS)
                            setStep(1)
                            setSlugEdited(false)
                        }}
                    />
                </div>
            </div>
        )
    }

    const planCols = 'grid grid-cols-1 gap-3 sm:grid-cols-3'

    return (
        <div className="px-8 py-8 animate-fade-in">
            {/* Back + title */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/tenants')}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to tenants
                </button>
                <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Create Tenant</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Provisions a new isolated database, storage bucket, and cache namespace.
                </p>
            </div>

            {/* Step indicator */}
            <div className="mb-8">
                <div className="flex items-center gap-0">
                    {WIZARD_STEPS.map((s, i) => (
                        <div key={s.id} className="flex flex-1 items-center">
                            <button
                                onClick={() => step > s.id && setStep(s.id)}
                                disabled={step <= s.id}
                                className="flex flex-col items-center gap-1.5"
                            >
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${step > s.id
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900'
                                        : step === s.id
                                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                        }`}
                                >
                                    {step > s.id ? <CheckCircle className="h-4 w-4" /> : s.id}
                                </div>
                                <span
                                    className={`hidden text-[11px] font-medium sm:block ${step >= s.id ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
                                        }`}
                                >
                                    {s.label}
                                </span>
                            </button>
                            {i < WIZARD_STEPS.length - 1 && (
                                <div className={`mx-2 flex-1 h-0.5 transition-all ${step > s.id ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Provisioning progress */}
            {isPending && (
                <div className="mb-6 card p-5 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {PROVISIONING_STEPS[provisionStep] ?? 'Processing…'}
                        </span>
                    </div>
                    <div className="mt-3 flex gap-1">
                        {PROVISIONING_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= provisionStep ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Step content */}
            <div className="card p-6 xl:p-8">
                {/* ── Step 1: Basic Info ── */}
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-indigo-500" />
                                Basic Information
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">Enter the tenant's name, contact details, and branding.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {/* Name */}
                            <div>
                                <label className="label">Tenant Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="Acme Corp"
                                    className={`input ${errors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
                                    autoFocus
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                            </div>

                            {/* Slug */}
                            <div>
                                <label className="label">Slug <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={(e) => {
                                        setSlugEdited(true)
                                        set('slug', e.target.value.toLowerCase())
                                    }}
                                    placeholder="acme-corp"
                                    className={`input font-mono ${errors.slug ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
                                />
                                {errors.slug ? (
                                    <p className="mt-1 text-xs text-red-500">{errors.slug}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-slate-400">
                                        Subdomain: <code className="font-mono">{form.slug || '…'}-admin.domain.com</code>
                                    </p>
                                )}
                            </div>

                            {/* Contact name */}
                            <div>
                                <label className="label">Contact Name</label>
                                <input
                                    type="text"
                                    value={form.contactName}
                                    onChange={(e) => set('contactName', e.target.value)}
                                    placeholder="John Doe"
                                    className="input"
                                />
                            </div>

                            {/* Contact email */}
                            <div>
                                <label className="label">Contact Email</label>
                                <input
                                    type="email"
                                    value={form.contactEmail}
                                    onChange={(e) => set('contactEmail', e.target.value)}
                                    placeholder="john@acme.com"
                                    className={`input ${errors.contactEmail ? 'border-red-400 focus:border-red-500' : ''}`}
                                />
                                {errors.contactEmail && <p className="mt-1 text-xs text-red-500">{errors.contactEmail}</p>}
                            </div>

                            {/* Contact phone */}
                            <div>
                                <label className="label">Contact Phone</label>
                                <input
                                    type="tel"
                                    value={form.contactPhone}
                                    onChange={(e) => set('contactPhone', e.target.value)}
                                    placeholder="+1 555 000 0000"
                                    className="input"
                                />
                            </div>

                            {/* Brand color */}
                            <div>
                                <label className="label">Brand Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={form.primaryColor}
                                        onChange={(e) => set('primaryColor', e.target.value)}
                                        className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800"
                                    />
                                    <input
                                        type="text"
                                        value={form.primaryColor}
                                        onChange={(e) => set('primaryColor', e.target.value)}
                                        placeholder="#6366f1"
                                        maxLength={7}
                                        className="input flex-1 font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="label">Address</label>
                            <textarea
                                value={form.address}
                                onChange={(e) => set('address', e.target.value)}
                                rows={2}
                                placeholder="123 Business Ave, City, Country"
                                className="input resize-none"
                            />
                        </div>

                        {/* Logo URL */}
                        <div>
                            <label className="label">Logo URL</label>
                            <input
                                type="url"
                                value={form.logoUrl}
                                onChange={(e) => set('logoUrl', e.target.value)}
                                placeholder="https://example.com/logo.png"
                                className="input"
                            />
                        </div>

                        {/* Internal notes */}
                        <div>
                            <label className="label">Internal Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => set('notes', e.target.value)}
                                rows={2}
                                placeholder="Admin notes (not visible to tenant)…"
                                className="input resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* ── Step 2: Subscription ── */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-indigo-500" />
                                Subscription Plan
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">Select a plan. Limits are pre-filled but can be customized in the next step.</p>
                        </div>

                        <div className={planCols}>
                            {PLANS.map((p) => {
                                const isSelected = form.subscriptionPlan === p.value
                                const colorMap: Record<string, string> = {
                                    indigo: 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-900/20',
                                    violet: 'border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/50 dark:bg-violet-900/20',
                                    purple: 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-50/50 dark:bg-purple-900/20',
                                }
                                const headerMap: Record<string, string> = {
                                    indigo: 'bg-indigo-600',
                                    violet: 'bg-violet-600',
                                    purple: 'bg-purple-700',
                                }
                                return (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => handlePlanSelect(p.value)}
                                        className={`rounded-xl border-2 text-left transition-all ${isSelected
                                            ? colorMap[p.color]
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <div className={`rounded-t-[10px] px-4 py-3 ${headerMap[p.color]}`}>
                                            <p className="font-semibold text-white">{p.label}</p>
                                            <p className="text-xs text-white/70">{p.price}</p>
                                        </div>
                                        <div className="p-4 space-y-1.5">
                                            {p.features.map((f) => (
                                                <div key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                                    {f}
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Trial days */}
                        <div className="card p-5">
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <label className="label">Trial Period (days)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={90}
                                        value={form.trialDays}
                                        onChange={(e) => set('trialDays', Number(e.target.value))}
                                        className="input w-32"
                                    />
                                    <p className="mt-1.5 text-xs text-slate-400">
                                        Set to 0 to skip the trial and start the subscription immediately.
                                    </p>
                                </div>
                                {form.trialDays > 0 && (
                                    <div className="rounded-xl bg-blue-50 px-4 py-3 text-center dark:bg-blue-900/20">
                                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{form.trialDays}</p>
                                        <p className="text-xs text-blue-500">day trial</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Limits ── */}
                {step === 3 && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Settings className="h-4 w-4 text-indigo-500" />
                                Resource Limits
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Customize limits for the <strong className="text-slate-700 dark:text-slate-300 capitalize">{form.subscriptionPlan}</strong> plan. Defaults are pre-filled.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {([
                                { key: 'maxUsers' as const, label: 'Max Users', unit: 'users', min: 1, max: 10000 },
                                { key: 'maxProducts' as const, label: 'Max Products', unit: 'products', min: 1, max: 999999 },
                                { key: 'maxOrdersPerMonth' as const, label: 'Max Orders / Month', unit: 'orders/mo', min: 1, max: 999999 },
                                { key: 'maxStorageMb' as const, label: 'Max Storage', unit: 'MB', min: 100, max: 500000 },
                            ] as const).map(({ key, label, unit, min, max }) => (
                                <div key={key}>
                                    <label className="label">{label}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={min}
                                            max={max}
                                            value={form[key]}
                                            onChange={(e) => set(key, Number(e.target.value))}
                                            className={`input flex-1 ${errors[key] ? 'border-red-400' : ''}`}
                                        />
                                        <span className="shrink-0 text-xs text-slate-400">{unit}</span>
                                    </div>
                                    {errors[key] && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 4: Review ── */}
                {step === 4 && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Eye className="h-4 w-4 text-indigo-500" />
                                Review & Create
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">Review all details before provisioning the tenant.</p>
                        </div>

                        {/* Preview card */}
                        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                            <div
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white shadow-sm"
                                style={{ backgroundColor: form.primaryColor }}
                            >
                                {form.name.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{form.name || 'Unnamed'}</p>
                                <code className="text-xs text-slate-400">{form.slug || 'no-slug'}</code>
                                <div className="mt-1 flex gap-2">
                                    <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 capitalize">
                                        {form.subscriptionPlan}
                                    </span>
                                    {form.trialDays > 0 && (
                                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                            {form.trialDays}d trial
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                            {[
                                ['Contact Name', form.contactName || '—'],
                                ['Contact Email', form.contactEmail || '—'],
                                ['Contact Phone', form.contactPhone || '—'],
                                ['Address', form.address || '—'],
                                ['Max Users', String(form.maxUsers)],
                                ['Max Products', String(form.maxProducts)],
                                ['Max Orders/mo', String(form.maxOrdersPerMonth)],
                                ['Storage', `${form.maxStorageMb} MB`],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <p className="text-xs text-slate-400">{label}</p>
                                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{value}</p>
                                </div>
                            ))}
                        </div>

                        {form.notes && (
                            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 dark:bg-amber-900/20 dark:border-amber-800/40">
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Internal Notes</p>
                                <p className="text-sm text-amber-800 dark:text-amber-300">{form.notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => step > 1 ? setStep((s) => s - 1) : navigate('/tenants')}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        {step > 1 ? 'Back' : 'Cancel'}
                    </button>

                    {step < 4 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="btn-primary flex items-center gap-2"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="btn-primary flex items-center gap-2 min-w-[140px] justify-center"
                        >
                            {isPending ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Creating…
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4" />
                                    Create Tenant
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

