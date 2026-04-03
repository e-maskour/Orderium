/**
 * FormField — Delivery portal form field wrapper with inline validation error display.
 * Used inside a <FormProvider> from react-hook-form.
 */
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/i18n';

interface FormFieldProps {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

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
        <label
          htmlFor={name}
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '0.375rem',
          }}
        >
          {label}
          {required && <span style={{ color: '#ef4444', marginInlineStart: '0.25rem' }}>*</span>}
        </label>
      )}

      {children ?? (
        <input
          id={name}
          type={type}
          {...register(name)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? `${name}-error` : undefined}
          style={{
            width: '100%',
            padding: '0.75rem 0.875rem',
            borderRadius: '0.75rem',
            border: `1.5px solid ${fieldError ? '#ef4444' : '#e5e7eb'}`,
            fontSize: '0.9375rem',
            outline: 'none',
            boxSizing: 'border-box' as const,
            background: disabled ? '#f9fafb' : '#fff',
          }}
        />
      )}

      {errorMessage && (
        <p
          id={`${name}-error`}
          role="alert"
          style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#ef4444' }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export function FormError({ name }: { name: string }) {
  const { t } = useLanguage();
  const {
    formState: { errors },
  } = useFormContext();

  const fieldError = resolvePath(errors, name);
  if (!fieldError?.message) return null;

  return (
    <p
      id={`${name}-error`}
      role="alert"
      style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#ef4444' }}
    >
      {t(fieldError.message as TranslationKey)}
    </p>
  );
}
