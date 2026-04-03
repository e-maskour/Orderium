import { useState, useEffect } from 'react';
import { slugify } from '../utils/slugify';
import type { CreateTenantInput, Tenant } from '../types/tenant';

interface Props {
  onSubmit: (data: CreateTenantInput) => Promise<void>;
  loading?: boolean;
  initial?: Partial<Tenant>;
  editMode?: boolean;
}

type FormData = CreateTenantInput;

const PLANS = ['basic', 'pro', 'enterprise'] as const;

const PLAN_COLORS: Record<string, string> = {
  basic:
    'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  pro: 'border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  enterprise:
    'border-purple-400 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

export function TenantForm({ onSubmit, loading = false, initial, editMode = false }: Props) {
  const [form, setForm] = useState<FormData>({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    contactName: initial?.contactName ?? '',
    contactEmail: initial?.contactEmail ?? '',
    contactPhone: initial?.contactPhone ?? '',
    address: initial?.address ?? '',
    notes: initial?.notes ?? '',
    subscriptionPlan: initial?.subscriptionPlan ?? 'basic',
    maxUsers: initial?.maxUsers ?? 10,
    primaryColor: initial?.primaryColor ?? '#6366f1',
    logoUrl: initial?.logoUrl ?? '',
  });
  const [slugEdited, setSlugEdited] = useState(editMode);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (!slugEdited && form.name) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
  }, [form.name, slugEdited]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      subscriptionPlan: form.subscriptionPlan,
      maxUsers: Number(form.maxUsers),
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
            type="tel"
            value={(form.contactPhone as string) ?? ''}
            onChange={(e) => set('contactPhone', e.target.value)}
            className="input"
          />
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

      {/* Plan + Users + Brand Color */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className="label">Plan</label>
          <div className="space-y-2">
            {PLANS.map((p) => {
              const isSelected = form.subscriptionPlan === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('subscriptionPlan', p)}
                  className={`w-full rounded-lg border-2 px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                    isSelected
                      ? PLAN_COLORS[p]
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Max Users</label>
          <input
            type="number"
            min={1}
            max={10000}
            value={(form.maxUsers as number) ?? 10}
            onChange={(e) => set('maxUsers', Number(e.target.value))}
            className="input"
          />
        </div>

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
