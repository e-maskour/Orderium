import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';
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

const CONFIRM_CLASS = {
  danger: 'btn-danger',
  warning: 'btn-warning',
  default: 'btn-primary',
} as const;

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

  // Reset whenever the dialog is opened for a different seeder, so a password
  // typed for one tenant never lingers into the next dialog.
  useEffect(() => {
    if (open) {
      setValues(initialValues(options));
      setTouched(false);
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

  const hasErrors = Object.keys(errors).length > 0;

  const submit = () => {
    setTouched(true);
    if (hasErrors) return;
    onConfirm(values);
  };

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      size="md"
      tone={confirmVariant === 'default' ? 'default' : confirmVariant}
      busy={loading}
      icon={<AlertTriangle className="h-5 w-5" />}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          {/* Submits the options form when there is one, so Enter works in a field. */}
          <button
            {...(options.length > 0
              ? { type: 'submit' as const, form: 'seeder-run-form' }
              : { type: 'button' as const, onClick: submit })}
            className={CONFIRM_CLASS[confirmVariant]}
            disabled={loading || (touched && hasErrors)}
          >
            {loading ? 'Running…' : confirmLabel}
          </button>
        </>
      }
    >
      {options.length > 0 && (
        <form
          id="seeder-run-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {options.map((opt) =>
            opt.type === 'boolean' ? (
              <label
                key={opt.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-800/50"
              >
                <input
                  type="checkbox"
                  checked={values[opt.key] === true}
                  onChange={(e) => setValues((v) => ({ ...v, [opt.key]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-amber-600 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-800"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
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
                <label htmlFor={`seeder-opt-${opt.key}`} className="label">
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
                  className="input"
                  aria-invalid={touched && !!errors[opt.key]}
                />
                {opt.danger && (
                  <p className="mt-1.5 flex gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                    {opt.danger}
                  </p>
                )}
                {touched && errors[opt.key] && (
                  <p
                    role="alert"
                    className="mt-1 text-xs font-medium text-red-600 dark:text-red-400"
                  >
                    {errors[opt.key]}
                  </p>
                )}
              </div>
            ),
          )}
        </form>
      )}
    </Modal>
  );
}
