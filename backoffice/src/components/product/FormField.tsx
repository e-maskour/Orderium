import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * ARIA wiring handed to the control. PrimeReact overlay components
 * (Dropdown, MultiSelect, AutoComplete, InputNumber) expect `inputId`
 * rather than `id`, so the control decides where to put `id` — the
 * field only guarantees the value is unique and the links are correct.
 */
export interface FieldAria {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

interface FormFieldProps {
  /** Unique, stable id — also the anchor target for the error summary. */
  id: string;
  label: string;
  required?: boolean;
  /** Help text. Always rendered as text, never as a tooltip alone. */
  help?: string;
  /** Resolved, already-translated error message. */
  error?: string;
  className?: string;
  children: (aria: FieldAria) => ReactNode;
}

/**
 * Label + control + help + error, with the accessible relationships
 * wired once so they cannot be got wrong per-field.
 */
export function FormField({
  id,
  label,
  required = false,
  help,
  error,
  className,
  children,
}: FormFieldProps) {
  const { t } = useLanguage();

  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`pform-field${className ? ` ${className}` : ''}`}>
      <label className="pform-field__label" htmlFor={id}>
        {label}
        {/* Required is conveyed as text, not by colour or a bare asterisk */}
        {required && <span className="pform-field__req">{t('required')}</span>}
      </label>

      {children({ id, describedBy, invalid: Boolean(error), required })}

      {help && (
        <p className="pform-field__help" id={helpId}>
          {help}
        </p>
      )}

      {error && (
        <p className="pform-field__error" id={errorId} role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
