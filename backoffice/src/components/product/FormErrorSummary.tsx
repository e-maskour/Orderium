import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface SummaryEntry {
  /** Field id to focus when the entry is activated. */
  fieldId: string;
  label: string;
  message: string;
}

interface FormErrorSummaryProps {
  entries: SummaryEntry[];
}

/**
 * Form-level error summary. Appears on failed submit so a validation
 * failure below the fold is still announced, and takes focus so keyboard
 * and screen-reader users land on it rather than hunting for the error.
 */
export function FormErrorSummary({ entries }: FormErrorSummaryProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (entries.length > 0) {
      ref.current?.focus();
    }
  }, [entries.length]);

  if (entries.length === 0) return null;

  const focusField = (fieldId: string) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  return (
    <div className="pform-summary" role="alert" tabIndex={-1} ref={ref}>
      <p className="pform-summary__title">
        <AlertCircle size={15} aria-hidden="true" />
        {t('validationCheckFields')}
      </p>
      <ul className="pform-summary__list">
        {entries.map((e) => (
          <li key={e.fieldId}>
            <button type="button" onClick={() => focusField(e.fieldId)}>
              {e.label} — {e.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
