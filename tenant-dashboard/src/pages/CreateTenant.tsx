import { useEffect, useState } from 'react';
import {
  PHONE_ERROR_MESSAGES,
  getMoroccanPhoneError,
  normalizeMoroccanPhone,
  phoneInputProps,
} from '../utils/phone';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  ExternalLink,
  Building2,
  CreditCard,
  Settings,
  Eye,
  ChevronRight,
  ChevronLeft,
  Zap,
  RotateCcw,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateTenant, usePlans } from '../hooks/useTenants';
import { slugify } from '../utils/slugify';
import { formatAmount } from '../utils/formatAmount';
import {
  DEFAULT_PLAN,
  DEFAULT_TRIAL_DAYS,
  NO_FEATURES,
  RECOMMENDED_PLAN,
  differsFromPlan,
  normalizeFeatures,
  pickLimits,
  planLabel,
  planStyle,
  sortPlans,
  validateLimits,
} from '../utils/plans';
import {
  FeaturesList,
  LimitsList,
  PlanFeaturesEditor,
  PlanLimitsEditor,
} from '../components/PlanLimitsEditor';
import type {
  CreateTenantInput,
  CreateTenantResponse,
  PlanFeatures,
  PlanLimitKey,
  PlanLimits,
  SubscriptionPlan,
  SubscriptionPlanData,
} from '../types/tenant';

// ─────────────────────────────── Wizard Steps ─────────────────────────────────

const WIZARD_STEPS = [
  { id: 1, label: 'Basic Info', icon: <Building2 className="h-4 w-4" /> },
  { id: 2, label: 'Subscription', icon: <CreditCard className="h-4 w-4" /> },
  { id: 3, label: 'Limits', icon: <Settings className="h-4 w-4" /> },
  { id: 4, label: 'Review', icon: <Eye className="h-4 w-4" /> },
];

const PROVISIONING_STEPS = [
  'Creating database…',
  'Running migrations…',
  'Creating storage bucket…',
  'Configuring cache…',
  'Finalizing tenant…',
];

type FormData = {
  // Step 1
  name: string;
  slug: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  primaryColor: string;
  logoUrl: string;
  // Step 2
  subscriptionPlan: SubscriptionPlan;
  trialDays: number;
  // Step 3 — pre-filled from the selected plan, overridable
  limits: PlanLimits;
  features: PlanFeatures;
  // Internal
  notes: string;
};

const DEFAULTS: FormData = {
  name: '',
  slug: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  primaryColor: '#6366f1',
  logoUrl: '',
  subscriptionPlan: DEFAULT_PLAN,
  trialDays: DEFAULT_TRIAL_DAYS,
  // Replaced by the plan's values as soon as `/admin/plans` loads.
  limits: pickLimits(null),
  features: NO_FEATURES,
  notes: '',
};

/** `MAD` is shown as `DH` across the dashboard's price labels. */
function currencyLabel(currency: string): string {
  return currency === 'MAD' ? 'DH' : currency;
}

function PlanPrice({ plan }: { plan: SubscriptionPlanData }) {
  if (plan.priceMonthly <= 0 && plan.priceYearly <= 0) {
    return <p className="text-xs text-white/80">Free — not billed</p>;
  }
  const cur = currencyLabel(plan.currency);
  return (
    <div className="text-xs text-white/80">
      <p>
        <span className="text-base font-bold text-white">
          {formatAmount(plan.priceMonthly, 0)} {cur}
        </span>{' '}
        HT / month
      </p>
      <p>
        {formatAmount(plan.priceYearly, 0)} {cur} HT / year
      </p>
    </div>
  );
}

// ─────────────────────────────── Success Screen ───────────────────────────────

function SuccessScreen({
  created,
  onCreateAnother,
  onView,
}: {
  created: CreateTenantResponse;
  onCreateAnother: () => void;
  onView: () => void;
}) {
  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="flex flex-col items-center py-8 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 shadow-sm">
        <CheckCircle className="h-8 w-8 text-emerald-500" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-slate-100">
        Tenant Created!
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        <strong className="text-slate-700 dark:text-slate-200">{created.name}</strong> has been
        provisioned and is ready to use.
      </p>

      <div className="mt-8 w-full max-w-lg space-y-2">
        <p className="mb-2 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">
          Portal URLs
        </p>
        {Object.entries(created.urls).map(([key, url]) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="text-left min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 capitalize">
                {key} Portal
              </p>
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {url}
              </p>
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
        <button onClick={onView} className="flex-1 btn-primary py-2.5">
          View Tenant
        </button>
        <button onClick={onCreateAnother} className="flex-1 btn-secondary py-2.5">
          Create Another
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────── Main Component ───────────────────────────────

export function CreateTenant() {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useCreateTenant();
  const [step, setStep] = useState(1);
  const [provisionStep, setProvisionStep] = useState(0);
  const [form, setForm] = useState<FormData>(DEFAULTS);
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [limitErrors, setLimitErrors] = useState<Partial<Record<PlanLimitKey, string>>>({});
  const [created, setCreated] = useState<CreateTenantResponse | null>(null);

  const { data: plansData, isLoading: plansLoading, isError: plansError, refetch } = usePlans();
  const plans = sortPlans(plansData);
  const selectedPlan = plans.find((p) => p.name === form.subscriptionPlan);
  // Limits/features are seeded from the plan once the catalogue arrives.
  const [planSeeded, setPlanSeeded] = useState(false);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Auto-slug from name
  const handleNameChange = (value: string) => {
    set('name', value);
    if (!slugEdited) {
      setForm((f) => ({ ...f, name: value, slug: slugify(value) }));
    }
  };

  const applyPlan = (plan: SubscriptionPlanData) => {
    setForm((f) => ({
      ...f,
      subscriptionPlan: plan.name,
      limits: pickLimits(plan),
      features: normalizeFeatures(plan.features),
      // The trial plan only makes sense with a trial period.
      trialDays: plan.name === 'trial' && f.trialDays < 1 ? DEFAULT_TRIAL_DAYS : f.trialDays,
    }));
    setErrors((e) => ({ ...e, subscriptionPlan: undefined, trialDays: undefined }));
    setLimitErrors({});
  };

  useEffect(() => {
    if (planSeeded || !plansData) return;
    const initial = plansData.find((p) => p.name === form.subscriptionPlan);
    if (initial) applyPlan(initial);
    setPlanSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plansData, planSeeded]);

  const setLimit = (key: PlanLimitKey, value: number) => {
    setForm((f) => ({ ...f, limits: { ...f.limits, [key]: value } }));
    setLimitErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setFeature = (key: keyof PlanFeatures, value: boolean) => {
    setForm((f) => ({ ...f, features: { ...f.features, [key]: value } }));
  };

  const customized = !!selectedPlan && differsFromPlan(selectedPlan, form.limits, form.features);

  const validateStep = (s: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (s === 1) {
      if (!form.name.trim()) newErrors.name = 'Name is required';
      if (!form.slug.trim()) {
        newErrors.slug = 'Slug is required';
      } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(form.slug)) {
        newErrors.slug = 'Lowercase letters, digits and hyphens only (min 2 chars)';
      }
      if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
        newErrors.contactEmail = 'Invalid email address';
      }
      const phoneError = getMoroccanPhoneError(form.contactPhone);
      if (phoneError) newErrors.contactPhone = PHONE_ERROR_MESSAGES[phoneError];
    }
    if (s === 2) {
      if (!selectedPlan) newErrors.subscriptionPlan = 'Select a plan';
      if (!Number.isInteger(form.trialDays) || form.trialDays < 0 || form.trialDays > 365) {
        newErrors.trialDays = 'Between 0 and 365 days';
      } else if (form.subscriptionPlan === 'trial' && form.trialDays < 1) {
        newErrors.trialDays = 'The trial plan needs at least 1 trial day';
      }
    }
    let newLimitErrors: Partial<Record<PlanLimitKey, string>> = {};
    if (s === 3) newLimitErrors = validateLimits(form.limits);
    setErrors(newErrors);
    setLimitErrors(newLimitErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newLimitErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleSubmit = async () => {
    // Re-check every step: the step indicator lets the user jump back and edit.
    for (const s of [1, 2, 3]) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }

    let idx = 0;
    const interval = setInterval(() => {
      idx = Math.min(idx + 1, PROVISIONING_STEPS.length - 1);
      setProvisionStep(idx);
    }, 700);

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
      ...form.limits,
      features: form.features,
    };

    try {
      const result = await mutateAsync(input);
      clearInterval(interval);
      setProvisionStep(PROVISIONING_STEPS.length);
      setCreated(result);
      toast.success(`Tenant "${result.name}" created!`);
    } catch (err: unknown) {
      clearInterval(interval);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create tenant';
      toast.error(message);
      setProvisionStep(0);
    }
  };

  if (created) {
    return (
      <div className="px-8 py-8">
        <div className="mx-auto max-w-2xl">
          <SuccessScreen
            created={created}
            onView={() => navigate(`/tenants/${created.id}`)}
            onCreateAnother={() => {
              setCreated(null);
              setForm(DEFAULTS);
              setPlanSeeded(false);
              setStep(1);
              setSlugEdited(false);
            }}
          />
        </div>
      </div>
    );
  }

  const planCols = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5';

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
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Create Tenant
        </h1>
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
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    step > s.id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900'
                      : step === s.id
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }`}
                >
                  {step > s.id ? <CheckCircle className="h-4 w-4" /> : s.id}
                </div>
                <span
                  className={`hidden text-[11px] font-medium sm:block ${
                    step >= s.id ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < WIZARD_STEPS.length - 1 && (
                <div
                  className={`mx-2 flex-1 h-0.5 transition-all ${step > s.id ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                />
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
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i <= provisionStep ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
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
              <p className="mt-1 text-sm text-slate-500">
                Enter the tenant's name, contact details, and branding.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label className="label">
                  Tenant Name <span className="text-red-500">*</span>
                </label>
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
                <label className="label">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    set('slug', e.target.value.toLowerCase());
                  }}
                  placeholder="acme-corp"
                  className={`input font-mono ${errors.slug ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
                />
                {errors.slug ? (
                  <p className="mt-1 text-xs text-red-500">{errors.slug}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    Subdomain:{' '}
                    <code className="font-mono">{form.slug || '…'}-admin.domain.com</code>
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
                {errors.contactEmail && (
                  <p className="mt-1 text-xs text-red-500">{errors.contactEmail}</p>
                )}
              </div>

              {/* Contact phone */}
              <div>
                <label className="label">Contact Phone</label>
                <input
                  {...phoneInputProps}
                  value={form.contactPhone}
                  onChange={(e) => set('contactPhone', normalizeMoroccanPhone(e.target.value))}
                  className={`input ${errors.contactPhone ? 'border-red-400' : ''}`}
                />
                {errors.contactPhone && (
                  <p className="mt-1 text-xs text-red-500">{errors.contactPhone}</p>
                )}
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
              <p className="mt-1 text-sm text-slate-500">
                Select a plan. Limits and features are pre-filled but can be customized in the next
                step. Prices are excl. VAT (HT).
              </p>
            </div>

            {plansLoading ? (
              <div className={planCols}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : plansError || plans.length === 0 ? (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
                <span>Could not load subscription plans.</span>
                <button type="button" onClick={() => refetch()} className="btn-secondary py-1.5">
                  Retry
                </button>
              </div>
            ) : (
              <div className={planCols}>
                {plans.map((p) => {
                  const isSelected = form.subscriptionPlan === p.name;
                  const style = planStyle(p.name);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPlan(p)}
                      aria-pressed={isSelected}
                      className={`relative flex flex-col rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? style.selected
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className={`rounded-t-[10px] px-4 py-3 ${style.header}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-white">{p.displayName}</p>
                          {p.name === RECOMMENDED_PLAN && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                              <Star className="h-3 w-3" /> Most popular
                            </span>
                          )}
                        </div>
                        <PlanPrice plan={p} />
                      </div>
                      <div className="flex-1 space-y-3 p-4">
                        <LimitsList limits={pickLimits(p)} />
                        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                          <FeaturesList features={normalizeFeatures(p.features)} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.subscriptionPlan && (
              <p className="text-xs text-red-500">{errors.subscriptionPlan}</p>
            )}

            {/* Trial days */}
            <div className="card p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="label">Trial Period (days)</label>
                  <input
                    type="number"
                    min={form.subscriptionPlan === 'trial' ? 1 : 0}
                    max={365}
                    value={form.trialDays}
                    onChange={(e) => set('trialDays', Number(e.target.value))}
                    className={`input w-32 ${errors.trialDays ? 'border-red-400' : ''}`}
                  />
                  {errors.trialDays ? (
                    <p className="mt-1.5 text-xs text-red-500">{errors.trialDays}</p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-400">
                      {form.subscriptionPlan === 'trial'
                        ? 'The tenant starts in trial and must move to a paid plan before it ends.'
                        : 'Trial period on the selected plan. Set to 0 to start the subscription immediately.'}
                    </p>
                  )}
                </div>
                {form.trialDays > 0 && (
                  <div className="rounded-xl bg-blue-50 px-4 py-3 text-center dark:bg-blue-900/20">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {form.trialDays}
                    </p>
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-indigo-500" />
                  Limits & Features
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Customize the{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {planLabel(form.subscriptionPlan, plans)}
                  </strong>{' '}
                  plan for this tenant. Defaults are pre-filled.
                </p>
              </div>
              {selectedPlan && customized && (
                <button
                  type="button"
                  onClick={() => applyPlan(selectedPlan)}
                  className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to plan defaults
                </button>
              )}
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                Resource limits
              </p>
              <PlanLimitsEditor
                limits={form.limits}
                onChange={setLimit}
                errors={limitErrors}
                defaults={selectedPlan}
              />
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                Features
              </p>
              <PlanFeaturesEditor
                features={form.features}
                onChange={setFeature}
                defaults={selectedPlan ? normalizeFeatures(selectedPlan.features) : undefined}
              />
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
              <p className="mt-1 text-sm text-slate-500">
                Review all details before provisioning the tenant.
              </p>
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
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {form.name || 'Unnamed'}
                </p>
                <code className="text-xs text-slate-400">{form.slug || 'no-slug'}</code>
                <div className="mt-1 flex gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${planStyle(form.subscriptionPlan).badge}`}
                  >
                    {planLabel(form.subscriptionPlan, plans)}
                  </span>
                  {form.trialDays > 0 && (
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                      {form.trialDays}d trial
                    </span>
                  )}
                  {customized && (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      Custom limits
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
                [
                  'List price (HT)',
                  selectedPlan && selectedPlan.priceMonthly > 0
                    ? `${formatAmount(selectedPlan.priceMonthly, 0)}\u00A0${currencyLabel(selectedPlan.currency)} / month · ${formatAmount(selectedPlan.priceYearly, 0)}\u00A0${currencyLabel(selectedPlan.currency)} / year`
                    : 'Free',
                ],
                ['Trial', form.trialDays > 0 ? `${form.trialDays} days` : 'None'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Limits
                </p>
                <LimitsList limits={form.limits} className="space-y-1 text-sm" />
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Features
                </p>
                <FeaturesList features={form.features} className="space-y-1 text-sm" />
              </div>
            </div>

            {form.notes && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 dark:bg-amber-900/20 dark:border-amber-800/40">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  Internal Notes
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{form.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate('/tenants'))}
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
  );
}
