import { formatAmount } from './formatAmount';
import {
  APP_LOCALE,
  formatDate as formatNumericDate,
  formatDateTime as formatNumericDateTime,
} from './dateFormat';
import { formatQuantity } from './numberFormat';

/** Date-only strings (`2026-08-08`) are read as local midnight, not UTC. */
function parseDateValue(value: string): Date | null {
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Local `YYYY-MM-DD` — never via toISOString, which shifts the day across time zones. */
function toLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats money for display. The currency comes from the record itself —
 * amounts from different currencies are never combined, so there is no
 * app-wide default to fall back on beyond the tenant default of MAD.
 */
export function formatMoney(amount: number, currency = 'MAD'): string {
  // French format regardless of browser locale: `12.374,90 MAD`
  return `${formatAmount(amount, 2)} ${currency}`;
}

/** `2026-08-08` → `08/08/2026`. Date-only strings are parsed as local dates. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return formatNumericDate(parseDateValue(value), '—');
}

/** Period label: `01/01/2026 – 31/03/2026`. */
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
  return toLocalIso(date);
}

/** `1536` → `1,5 KB`. Mirrors the API's own byte formatting, with a French comma decimal. */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${formatAmount(bytes / Math.pow(1024, i), i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Compact counts for KPI tiles (French): `1234` → `1,2 k`, `1500000` → `1,5 M`.
 * Numbers below 1000 are shown in full — rounding those loses real information.
 */
export function formatCompact(value: number | null | undefined): string {
  const n = value ?? 0;
  if (Math.abs(n) < 1000) return formatQuantity(n);
  return new Intl.NumberFormat(APP_LOCALE, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

/** `2026-09-06T14:03:00Z` → `06/09/2026 14:03`. Used for "as of" freshness labels. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return formatNumericDateTime(value, '—');
}

/** `2026-09-06` shifted by `days`, staying in `YYYY-MM-DD`. */
export function shiftIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** `2026-09-06` → `6 sept.`. Compact (French) axis label for daily charts. */
export function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: 'numeric',
    month: 'short',
  }).format(date);
}
