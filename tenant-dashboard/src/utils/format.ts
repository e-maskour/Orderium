/**
 * Formats money for display. The currency comes from the record itself —
 * amounts from different currencies are never combined, so there is no
 * app-wide default to fall back on beyond the tenant default of MAD.
 */
export function formatMoney(amount: number, currency = 'MAD'): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** `2026-08-08` → `8 Aug 2026`. Date-only strings are parsed as-is. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Compact period label: `Jan – Dec 2026` or `1 Jan 2026 – 31 Mar 2026`. */
export function formatPeriod(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * Whole days until `date`; negative once it has passed. Both sides are
 * normalised to midnight so a due date today reads as 0, not a fraction.
 */
export function daysUntil(date: string): number {
  const target = new Date(`${date.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Today as `YYYY-MM-DD`, for date-input defaults. */
export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Adds `months` to an ISO date, clamping to the end of a shorter month. */
export function addMonths(iso: string, months: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const targetDay = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() < targetDay) date.setDate(0);
  return date.toISOString().slice(0, 10);
}
