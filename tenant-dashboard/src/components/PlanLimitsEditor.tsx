import { useRef } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { DecimalInput } from './DecimalInput';
import {
  FEATURE_FIELDS,
  LIMIT_FIELDS,
  UNLIMITED,
  UNLIMITED_LABEL,
  formatLimitValue,
  formatStorageMb,
  isUnlimited,
} from '../utils/plans';
import type { PlanFeatureKey, PlanFeatures, PlanLimitKey, PlanLimits } from '../types/tenant';

// ─── Limits ──────────────────────────────────────────────────────────────────

interface LimitsEditorProps {
  limits: PlanLimits;
  onChange: (key: PlanLimitKey, value: number) => void;
  errors?: Partial<Record<PlanLimitKey, string>>;
  /** Plan defaults, used to restore a value when "unlimited" is unticked. */
  defaults?: Partial<PlanLimits>;
  /** Grid columns on wide screens. */
  columns?: 2 | 3;
}

/** Edits the six plan limits; each can be set to unlimited (`-1`). */
export function PlanLimitsEditor({
  limits,
  onChange,
  errors = {},
  defaults,
  columns = 2,
}: LimitsEditorProps) {
  // Last finite value per field, so unticking "unlimited" restores it.
  const lastFinite = useRef<Partial<PlanLimits>>({});

  const toggleUnlimited = (key: PlanLimitKey, min: number, checked: boolean) => {
    if (checked) {
      if (!isUnlimited(limits[key])) lastFinite.current[key] = limits[key];
      onChange(key, UNLIMITED);
      return;
    }
    const fallback = defaults?.[key];
    onChange(
      key,
      lastFinite.current[key] ??
        (fallback !== undefined && !isUnlimited(fallback) ? fallback : min),
    );
  };

  return (
    <div
      className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''}`}
    >
      {LIMIT_FIELDS.map(({ key, label, unit, min }) => {
        const unlimited = isUnlimited(limits[key]);
        const inputId = `limit-${key}`;
        return (
          <div key={key}>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={inputId} className="label">
                {label}
              </label>
              <label className="mb-1.5 flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={unlimited}
                  onChange={(e) => toggleUnlimited(key, min, e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                />
                {UNLIMITED_LABEL}
              </label>
            </div>
            <div className="flex items-center gap-2">
              {unlimited ? (
                <input
                  id={inputId}
                  type="text"
                  value={UNLIMITED_LABEL}
                  disabled
                  className="input flex-1 cursor-not-allowed opacity-60"
                />
              ) : (
                <DecimalInput
                  id={inputId}
                  maxFractionDigits={0}
                  min={min}
                  value={limits[key]}
                  // NaN while the field is empty: validation flags it instead of
                  // silently snapping back to a number under the cursor.
                  onValueChange={(v) => onChange(key, v ?? NaN)}
                  className={`input flex-1 ${errors[key] ? 'border-red-400' : ''}`}
                  aria-invalid={!!errors[key]}
                />
              )}
              <span className="w-16 shrink-0 text-xs text-slate-400">{unit}</span>
            </div>
            {errors[key] ? (
              <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
            ) : (
              key === 'maxStorageMb' &&
              !unlimited && (
                <p className="mt-1 text-xs text-slate-400">≈ {formatStorageMb(limits[key])}</p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────

interface FeaturesEditorProps {
  features: PlanFeatures;
  onChange: (key: PlanFeatureKey, value: boolean) => void;
  /** Plan defaults — fields that differ are marked as overridden. */
  defaults?: PlanFeatures;
}

/** The four feature toggles (pos, delivery, client_portal, reports). */
export function PlanFeaturesEditor({ features, onChange, defaults }: FeaturesEditorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {FEATURE_FIELDS.map(({ key, label, description }) => {
        const enabled = features[key];
        const overridden = defaults !== undefined && defaults[key] !== enabled;
        return (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(key, !enabled)}
            className={[
              'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150',
              enabled
                ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-700 dark:bg-indigo-900/20'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600',
            ].join(' ')}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
                <span
                  className={[
                    'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
                    enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                      enabled ? 'translate-x-4' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{description}</p>
              {overridden && (
                <p className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Overrides plan default
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Read-only summaries ─────────────────────────────────────────────────────

/** Compact list of limits, e.g. on plan cards and the review step. */
export function LimitsList({
  limits,
  className = 'space-y-1 text-xs',
}: {
  limits: PlanLimits;
  className?: string;
}) {
  return (
    <dl className={className}>
      {LIMIT_FIELDS.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between gap-2">
          <dt className="text-slate-500 dark:text-slate-400">{label.replace(/^Max /, '')}</dt>
          <dd className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
            {formatLimitValue(key, limits[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Feature flags as included / not included rows. */
export function FeaturesList({
  features,
  className = 'space-y-1 text-xs',
}: {
  features: PlanFeatures;
  className?: string;
}) {
  return (
    <ul className={className}>
      {FEATURE_FIELDS.map(({ key, label }) => (
        <li
          key={key}
          className={`flex items-center gap-2 ${features[key] ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 line-through dark:text-slate-500'}`}
        >
          {features[key] ? (
            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
          )}
          {label}
        </li>
      ))}
    </ul>
  );
}
