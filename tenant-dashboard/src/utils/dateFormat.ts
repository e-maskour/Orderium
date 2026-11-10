// French date conventions for every Marnova app, regardless of UI language or browser locale.
// Numeric dates are always dd/MM/yyyy and times are 24h HH:mm.

export const APP_LOCALE = 'fr-FR';

type DateInput = Date | string | number | null | undefined;

const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateFmt = new Intl.DateTimeFormat(APP_LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat(APP_LOCALE, { hour: '2-digit', minute: '2-digit' });

/** "18/10/2026" — returns `fallback` for empty or invalid input. */
export function formatDate(value: DateInput, fallback = ''): string {
  const date = toDate(value);
  return date ? dateFmt.format(date) : fallback;
}

/** "14:30" */
export function formatTime(value: DateInput, fallback = ''): string {
  const date = toDate(value);
  return date ? timeFmt.format(date) : fallback;
}

/** "18/10/2026 14:30" */
export function formatDateTime(value: DateInput, fallback = ''): string {
  const date = toDate(value);
  return date ? `${dateFmt.format(date)} ${timeFmt.format(date)}` : fallback;
}
