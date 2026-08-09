import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import type { SeederOptionDef, SeederOptions } from '../types/seeder';

interface Props {
  open: boolean;
  title: string;
  description: string;
  /** Rendered as form fields. A seeder with no options gets a plain confirm. */
  options: SeederOptionDef[];
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  onConfirm: (values: SeederOptions) => void;
  onCancel: () => void;
}

function initialValues(options: SeederOptionDef[]): SeederOptions {
  const values: SeederOptions = {};
  for (const opt of options) {
    values[opt.key] = opt.type === 'boolean' ? false : '';
  }
  return values;
}

/**
 * Confirmation dialog that renders whatever inputs a seeder declares.
 *
 * The dialog knows nothing about any particular seeder — options come from the
 * API catalogue, so a seeder that gains a new option needs no frontend change.
 */
export function SeederRunDialog({
  open,
  title,
  description,
  options,
  confirmLabel = 'Run seeder',
  confirmVariant = 'warning',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const [values, setValues] = useState<SeederOptions>(() => initialValues(options));
  const [touched, setTouched] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Reset whenever the dialog is opened for a different seeder, so a password
  // typed for one tenant never lingers into the next dialog.
  useEffect(() => {
    if (open) {
      setValues(initialValues(options));
      setTouched(false);
      cancelRef.current?.focus();
    }
  }, [open, options]);

  const errors = useMemo(() => {
    const found: Record<string, string> = {};
    for (const opt of options) {
      if (opt.type === 'boolean' || !opt.required) continue;
      const raw = values[opt.key];
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (!value) {
        found[opt.key] = `${opt.label} is required`;
      } else if (opt.minLength && value.length < opt.minLength) {
        found[opt.key] = `Must be at least ${opt.minLength} characters`;
      }
    }
    return found;
  }, [options, values]);

  if (!open) return null;

  const hasErrors = Object.keys(errors).length > 0;

  const btnClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : confirmVariant === 'warning'
        ? 'bg-amber-500 hover:bg-amber-600 text-white'
        : 'bg-neutral-900 hover:bg-neutral-700 text-white dark:bg-neutral-100 dark:text-neutral-900';

  const submit = () => {
    setTouched(true);
    if (hasErrors) return;
    onConfirm(values);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seeder-dialog-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="pr-6">
            <h3
              id="seeder-dialog-title"
              className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {title}
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
          </div>
        </div>

        {options.length > 0 && (
          <div className="mt-5 space-y-4 border-t border-neutral-200 pt-5 dark:border-neutral-700">
            {options.map((opt) =>
              opt.type === 'boolean' ? (
                <label key={opt.key} className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={values[opt.key] === true}
                    onChange={(e) => setValues((v) => ({ ...v, [opt.key]: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-amber-600 focus:ring-amber-500 dark:border-neutral-600 dark:bg-neutral-800"
                  />
                  <span>
                    <span className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {opt.label}
                    </span>
                    {opt.danger && (
                      <span className="mt-1 flex gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                        <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                        {opt.danger}
                      </span>
                    )}
                  </span>
                </label>
              ) : (
                <div key={opt.key}>
                  <label
                    htmlFor={`seeder-opt-${opt.key}`}
                    className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
                  >
                    {opt.label}
                    {opt.required && <span className="ml-0.5 text-red-500">*</span>}
                  </label>
                  <input
                    id={`seeder-opt-${opt.key}`}
                    type={opt.type === 'password' ? 'password' : 'text'}
                    autoComplete={opt.type === 'password' ? 'new-password' : 'off'}
                    placeholder={opt.placeholder}
                    value={(values[opt.key] as string) ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [opt.key]: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  {opt.danger && (
                    <p className="mt-1.5 flex gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                      {opt.danger}
                    </p>
                  )}
                  {touched && errors[opt.key] && (
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                      {errors[opt.key]}
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || (touched && hasErrors)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${btnClass}`}
          >
            {loading ? 'Running…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
