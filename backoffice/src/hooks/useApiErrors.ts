import type { UseFormReturn, Path, FieldValues } from 'react-hook-form';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/i18n';
import { notify } from '@orderium/ui';

// Maps English NestJS constraint names → i18n key suffix
const CONSTRAINT_MAP: Record<string, string> = {
  isNotEmpty: 'Required',
  isEmail: 'Invalid',
  isString: 'Type',
  isNumber: 'Type',
  min: 'Min',
  max: 'Max',
  minLength: 'Min',
  maxLength: 'Max',
  isPhoneNumber: 'Invalid',
  matches: 'Invalid',
};

function mapConstraintToKey(field: string, constraintOrMessage: string): string {
  // If message already looks like an i18n key (starts with 'validation')
  if (constraintOrMessage.startsWith('validation')) return constraintOrMessage;

  const constraint = Object.keys(CONSTRAINT_MAP).find((c) =>
    constraintOrMessage.toLowerCase().includes(c.toLowerCase()),
  );
  const suffix = constraint ? CONSTRAINT_MAP[constraint] : 'ServerError';
  const capitalised = field.charAt(0).toUpperCase() + field.slice(1);
  return `validation${capitalised}${suffix}`;
}

export function useApiErrors<T extends FieldValues>(form: UseFormReturn<T>) {
  const { t } = useLanguage();

  function handleApiErrors(error: unknown): void {
    // Try to extract a structured error body
    const data = (error as any)?.response?.data ?? (error as any)?.data ?? null;

    // Case 1: structured errors array — [{ field, message }]
    if (data && Array.isArray(data.errors) && data.errors.length > 0) {
      for (const err of data.errors) {
        const key = mapConstraintToKey(err.field, err.message);
        try {
          form.setError(err.field as Path<T>, { type: 'server', message: key });
        } catch {
          // Field not in this form schema — toasted only
        }
      }
      notify.error(t('validationCheckFields' as TranslationKey));
      return;
    }

    // Case 2: NestJS ValidationPipe — message is a string[] joined or an array
    const rawMessage: string = (error as any)?.message ?? (data?.message as string) ?? '';

    const messages: string[] = Array.isArray(data?.message)
      ? data.message
      : rawMessage
          .split(',')
          .map((m: string) => m.trim())
          .filter(Boolean);

    if (messages.length > 0) {
      const fieldNames = Object.keys(form.getValues()) as string[];
      let matched = false;

      for (const msg of messages) {
        const field = fieldNames.find((f) => msg.toLowerCase().includes(f.toLowerCase()));
        if (field) {
          const key = mapConstraintToKey(field, msg);
          form.setError(field as Path<T>, { type: 'server', message: key });
          matched = true;
        }
      }

      notify.error(
        matched
          ? t('validationCheckFields' as TranslationKey)
          : t('validationUnexpectedError' as TranslationKey),
      );
      return;
    }

    // Case 3: generic error
    notify.error(t('validationUnexpectedError' as TranslationKey));
  }

  return { handleApiErrors };
}
