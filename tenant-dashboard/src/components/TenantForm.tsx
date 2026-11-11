import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { slugify } from '../utils/slugify';
import {
  PHONE_ERROR_MESSAGES,
  getMoroccanPhoneError,
  normalizeMoroccanPhone,
  phoneInputProps,
} from '../utils/phone';
import { usePlans } from '../hooks/useTenants';
import { PlanFeaturesEditor, PlanLimitsEditor } from './PlanLimitsEditor';
import {
  DEFAULT_PLAN,
  differsFromPlan,
  normalizeFeatures,
  pickLimits,
  planLabel,
  planStyle,
  sortPlans,
  validateLimits,
} from '../utils/plans';
import type {
  CreateTenantInput,
  PlanFeatures,
  PlanLimitKey,
  PlanLimits,
  SubscriptionPlan,
  SubscriptionPlanData,
  Tenant,
} from '../types/tenant';

interface Props {
  onSubmit: (data: CreateTenantInput) => Promise<void>;
  loading?: boolean;
  initial?: Partial<Tenant>;
  editMode?: boolean;
}

type FormData = Omit<CreateTenantInput, keyof PlanLimits | 'features' | 'trialDays' | 'settings'>;

export function TenantForm({ onSubmit, loading = false, initial, editMode = false }: Props) {
  const [form, setForm] = useState<FormData>({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    contactName: initial?.contactName ?? '',
    contactEmail: initial?.contactEmail ?? '',
    contactPhone: initial?.contactPhone ?? '',
    address: initial?.address ?? '',
    notes: initial?.notes ?? '',
    subscriptionPlan: initial?.subscriptionPlan ?? DEFAULT_PLAN,
    primaryColor: initial?.primaryColor ?? '#6366f1',
    logoUrl: initial?.logoUrl ?? '',
  });
  const [limits, setLimits] = useState<PlanLimits>(() => pickLimits(initial));
  const [features, setFeatures] = useState<PlanFeatures>(() =>
    normalizeFeatures(initial?.features),
  );
  const [slugEdited, setSlugEdited] = useState(editMode);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [limitErrors, setLimitErrors] = useState<Partial<Record<PlanLimitKey, string>>>({});
  /** Set after a plan switch: asks whether to adopt the new plan's defaults. */
  const [resetOffer, setResetOffer] = useState<SubscriptionPlanData | null>(null);

  const { data: plansData, isLoading: plansLoading } = usePlans();
  const plans = sortPlans(plansData);
  const selectedPlan = plans.find((p) => p.name === form.subscriptionPlan);
  const customized = !!selectedPlan && differsFromPlan(selectedPlan, limits, features);

  useEffect(() => {
    if (!slugEdited && form.name) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
  }, [form.name, slugEdited]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const applyPlanDefaults = (plan: SubscriptionPlanData) => {
    setLimits(pickLimits(plan));
    setFeatures(normalizeFeatures(plan.features));
    setLimitErrors({});
    setResetOffer(null);
  };

  const selectPlan = (plan: SubscriptionPlanData) => {
    if (plan.name === form.subscriptionPlan) return;
    set('subscriptionPlan', plan.name);
    // Limits and features stay as they are until the operator decides.
    setResetOffer(differsFromPlan(plan, limits, features) ? plan : null);
  };

  const setLimit = (key: PlanLimitKey, value: number) => {
    setLimits((l) => ({ ...l, [key]: value }));
    setLimitErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.name?.toString().trim()) newErrors.name = 'Name is required';
    if (!form.slug?.toString().trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(form.slug?.toString() ?? '')) {
      newErrors.slug = 'Lowercase alphanumeric with hyphens (min 2 chars)';
    }
    if (
      form.contactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail?.toString() ?? '')
    ) {
      newErrors.contactEmail = 'Invalid email address';
    }
    const phoneError = getMoroccanPhoneError(form.contactPhone?.toString() ?? '');
    if (phoneError) newErrors.contactPhone = PHONE_ERROR_MESSAGES[phoneError];
    const newLimitErrors = validateLimits(limits);
    setErrors(newErrors);
    setLimitErrors(newLimitErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newLimitErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: CreateTenantInput = {
      name: form.name?.toString().trim() ?? '',
      slug: form.slug?.toString().trim() ?? '',
      ...(form.contactName && { contactName: form.contactName?.toString() }),
      ...(form.contactEmail && { contactEmail: form.contactEmail?.toString() }),
      ...(form.contactPhone && { contactPhone: form.contactPhone?.toString() }),
      ...(form.address && { address: form.address?.toString() }),
      ...(form.notes && { notes: form.notes?.toString() }),
      subscriptionPlan: form.subscriptionPlan as SubscriptionPlan,
      ...limits,
      features,
      ...(form.primaryColor && { primaryColor: form.primaryColor?.toString() }),
      ...(form.logoUrl && { logoUrl: form.logoUrl?.toString() }),
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name & Slug */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="label">
            Tenant Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={(form.name as string) ?? ''}
            onChange={(e) => set('name', e.target.value)}
            className={`input ${errors.name ? 'border-red-400 focus:border-red-500' : ''}`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label className="label">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={(form.slug as string) ?? ''}
            disabled={editMode}
            onChange={(e) => {
              setSlugEdited(true);
              set('slug', e.target.value.toLowerCase());
            }}
            placeholder="auto-generated"
            className={`input font-mono ${errors.slug ? 'border-red-400' : ''} ${editMode ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {errors.slug ? (
            <p className="mt-1 text-xs text-red-500">{errors.slug}</p>
          ) : (
            !editMode && (
              <p className="mt-1 text-xs text-slate-400">
                e.g.{' '}
                <code className="font-mono">{(form.slug as string) || '…'}-admin.domain.com</code>
              </p>
            )
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="label">Contact Name</label>
          <input
            type="text"
            value={(form.contactName as string) ?? ''}
            onChange={(e) => set('contactName', e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label">Contact Email</label>
          <input
            type="email"
            value={(form.contactEmail as string) ?? ''}
            onChange={(e) => set('contactEmail', e.target.value)}
            className={`input ${errors.contactEmail ? 'border-red-400' : ''}`}
          />
          {errors.contactEmail && (
            <p className="mt-1 text-xs text-red-500">{errors.contactEmail}</p>
          )}
        </div>
        <div>
          <label className="label">Contact Phone</label>
          <input
            {...phoneInputProps}
            value={(form.contactPhone as string) ?? ''}
            onChange={(e) => set('contactPhone', normalizeMoroccanPhone(e.target.value))}
            className={`input ${errors.contactPhone ? 'border-red-400' : ''}`}
          />
          {errors.contactPhone && (
            <p className="mt-1 text-xs text-red-500">{errors.contactPhone}</p>
          )}
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="label">Address</label>
        <textarea
          value={(form.address as string) ?? ''}
          onChange={(e) => set('address', e.target.value)}
          rows={2}
          className="input resize-none"
        />
      </div>

      {/* Brand Color */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className="label">Brand Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(form.primaryColor as string) ?? '#6366f1'}
              onChange={(e) => set('primaryColor', e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700"
            />
            <input
              type="text"
              value={(form.primaryColor as string) ?? ''}
              onChange={(e) => set('primaryColor', e.target.value)}
              placeholder="#6366f1"
              maxLength={7}
              className="input flex-1 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="space-y-5 rounded-xl border border-slate-200 p-5 dark:border-slate-700">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="label mb-0">Plan</label>
            {selectedPlan && customized && !resetOffer && (
              <button
                type="button"
                onClick={() => applyPlanDefaults(selectedPlan)}
                className="btn-ghost flex items-center gap-1.5 px-2 py-1 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to {selectedPlan.displayName} defaults
              </button>
            )}
          </div>
          {plansLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {plans.map((p) => {
                const isSelected = form.subscriptionPlan === p.name;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => selectPlan(p)}
                    className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? planStyle(p.name).selected
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {p.displayName}
                  </button>
                );
              })}
              {/* A legacy/unknown plan stays visible so it is not silently changed. */}
              {!selectedPlan && form.subscriptionPlan && (
                <span className="rounded-lg border-2 border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-600">
                  {planLabel(form.subscriptionPlan, plans)} (current)
                </span>
              )}
            </div>
          )}
        </div>

        {resetOffer && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/50 dark:bg-amber-900/20">
            <p className="text-amber-800 dark:text-amber-300">
              Reset limits and features to the <strong>{resetOffer.displayName}</strong> plan
              defaults?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyPlanDefaults(resetOffer)}
                className="btn-primary py-1.5 text-xs"
              >
                Apply plan defaults
              </button>
              <button
                type="button"
                onClick={() => setResetOffer(null)}
                className="btn-secondary py-1.5 text-xs"
              >
                Keep current values
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Resource limits
          </p>
          <PlanLimitsEditor
            limits={limits}
            onChange={setLimit}
            errors={limitErrors}
            defaults={selectedPlan}
            columns={3}
          />
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Features
          </p>
          <PlanFeaturesEditor
            features={features}
            onChange={(key, value) => setFeatures((f) => ({ ...f, [key]: value }))}
            defaults={selectedPlan ? normalizeFeatures(selectedPlan.features) : undefined}
          />
        </div>
      </div>

      {/* Logo URL */}
      <div>
        <label className="label">Logo URL</label>
        <input
          type="url"
          value={(form.logoUrl as string) ?? ''}
          onChange={(e) => set('logoUrl', e.target.value)}
          placeholder="https://…"
          className="input"
        />
      </div>

      {/* Internal notes */}
      <div>
        <label className="label">Internal Notes</label>
        <textarea
          value={(form.notes as string) ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          placeholder="Admin-only notes…"
          className="input resize-none"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading} className="btn-primary px-6 py-2.5">
          {loading
            ? editMode
              ? 'Saving…'
              : 'Creating…'
            : editMode
              ? 'Save Changes'
              : 'Create Tenant'}
        </button>
      </div>
    </form>
  );
}
