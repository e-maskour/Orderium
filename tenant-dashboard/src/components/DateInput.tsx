import { forwardRef, useEffect, useState } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface DateInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  /** ISO `yyyy-MM-dd` string, or '' when empty — same contract as `<input type="date">`. */
  value: string | null | undefined;
  /** Called with an ISO `yyyy-MM-dd` string for a complete valid date, or '' when cleared. */
  onChange: (value: string) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-10-18` → `18/10/2026`; anything unparseable → ''. */
function isoToDisplay(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/** `18/10/2026` → `2026-10-18`, or null if it is not a real calendar date. */
function displayToIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  // Built from local parts so the day never shifts across time zones
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Keeps digits only and inserts the slashes: `18102026` → `18/10/2026`. */
function maskDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Text date input in French format (dd/mm/yyyy), regardless of browser locale.
 * Drop-in replacement for `<input type="date">`: value/onChange use ISO `yyyy-MM-dd`.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { value, onChange, onBlur, placeholder = 'jj/mm/aaaa', ...rest },
  ref,
) {
  const [text, setText] = useState(() => isoToDisplay(value));

  // Follow external changes, but keep a partially typed date intact
  useEffect(() => {
    const iso = value ?? '';
    if (iso === '' ? text !== '' && displayToIso(text) !== null : displayToIso(text) !== iso) {
      setText(isoToDisplay(iso));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={10}
      placeholder={placeholder}
      {...rest}
      value={text}
      onChange={(e) => {
        const input = e.target.value;
        // Let backspace remove a slash without it being re-inserted immediately
        const deleting = input.length < text.length;
        const next = deleting ? input.replace(/[^\d/]/g, '') : maskDigits(input);
        setText(next);
        if (next === '') {
          onChange('');
          return;
        }
        const iso = displayToIso(next);
        if (iso) onChange(iso);
      }}
      onBlur={(e) => {
        // Drop an incomplete or invalid date back to the last valid value
        if (text !== '' && !displayToIso(text)) setText(isoToDisplay(value));
        onBlur?.(e);
      }}
    />
  );
});
