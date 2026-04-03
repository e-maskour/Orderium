/**
 * FormField — Backoffice form field wrapper with inline validation error display.
 *
 * Designed for use inside a <FormProvider> from react-hook-form.
 * Handles label, required marker, inline error message, and aria attributes.
 * For complex PrimeReact inputs (InputNumber, Dropdown, etc.) use the children
 * prop and wire them separately with `Controller`.
 */
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/i18n';
import { InputText } from 'primereact/inputtext';

interface FormFieldProps {
  /** Field name — must match the RHF form key exactly */
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Custom input component (e.g. InputText, InputTextarea). Defaults to InputText. */
  as?: React.ComponentType<any>;
  /** When true, renders children instead of a built-in input */
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

/** Resolves a nested path like "items.0.quantity" in an errors object */
function resolvePath(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((cur, key) => cur?.[key], obj);
}

export function FormField({
  name,
  label,
  type = 'text',
  required,
  placeholder,
  disabled,
  as: Component = InputText,
  children,
  style,
  className,
}: FormFieldProps) {
  const { t } = useLanguage();
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const fieldError = resolvePath(errors, name);
  const errorMessage = fieldError?.message ? t(fieldError.message as TranslationKey) : undefined;

  return (
    <div style={style} className={className}>
      {label && (
        <label htmlFor={name} className="p-label" style={{ display: 'block' }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginInlineStart: '0.25rem' }}>*</span>}
        </label>
      )}

      {children ?? (
        <Component
          id={name}
          type={type}
          {...register(name)}
          className={fieldError ? 'p-invalid' : ''}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? `${name}-error` : undefined}
          style={{ width: '100%' }}
        />
      )}

      {errorMessage && (
        <small
          id={`${name}-error`}
          className="p-error"
          role="alert"
          style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: '#ef4444' }}
        >
          {errorMessage}
        </small>
      )}
    </div>
  );
}

/**
 * FormError — Standalone inline error display for a named field.
 * Use this next to custom PrimeReact Controller inputs where you
 * need the error message but manage the input separately.
 */
export function FormError({ name }: { name: string }) {
  const { t } = useLanguage();
  const {
    formState: { errors },
  } = useFormContext();

  const fieldError = resolvePath(errors, name);
  if (!fieldError?.message) return null;

  const msg = t(fieldError.message as TranslationKey);
  return (
    <small
      id={`${name}-error`}
      className="p-error"
      role="alert"
      style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: '#ef4444' }}
    >
      {msg}
    </small>
  );
}
