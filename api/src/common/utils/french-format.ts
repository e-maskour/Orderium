/**
 * French display formatting for server-generated, user-facing text
 * (PDF documents, PDF reports, notification messages).
 *
 * Numbers always use "." as thousands separator and "," as decimal separator
 * ("12.374,90"), matching `shared/ui/src/formatAmount.ts`. Dates always use
 * the French numeric layout `dd/MM/yyyy` (and `HH:mm` for times), regardless
 * of the document language.
 *
 * Never use these for values stored in the database or returned in JSON API
 * responses — those must stay plain JS numbers / ISO strings.
 */

type NumericInput = number | string | null | undefined;
type DateInput = Date | string | number | null | undefined;

export interface FrenchDateOptions {
  /** IANA time zone. Omit to use the server's local time zone. */
  timeZone?: string;
}

function toFiniteNumber(value: NumericInput): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function groupThousands(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formats an amount: `formatAmount(12374.9)` → `"12.374,90"`.
 * Invalid / empty input renders as zero (`"0,00"`), like the frontend helper.
 */
export function formatAmount(value: NumericInput, decimals = 2): string {
  const num = toFiniteNumber(value) ?? 0;
  const [integer, decimal] = num.toFixed(decimals).split('.');
  const grouped = groupThousands(integer);
  return decimals > 0 ? `${grouped},${decimal}` : grouped;
}

/**
 * Formats a quantity without trailing zeros:
 * `2.5` → `"2,5"`, `1250` → `"1.250"`, `1.23456` → `"1,235"`.
 */
export function formatQuantity(value: NumericInput, maxDecimals = 3): string {
  const num = toFiniteNumber(value) ?? 0;
  const [integer, decimal = ''] = num.toFixed(maxDecimals).split('.');
  const trimmed = decimal.replace(/0+$/, '');
  // Avoid "-0" when a tiny negative value rounds to zero.
  const safeInteger = /^-0+$/.test(integer) && !trimmed ? '0' : integer;
  const grouped = groupThousands(safeInteger);
  return trimmed ? `${grouped},${trimmed}` : grouped;
}

function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getParts(
  date: Date,
  withTime: boolean,
  timeZone: string | undefined,
): Record<string, string> {
  const key = `${withTime ? 'dt' : 'd'}|${timeZone ?? ''}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(withTime
        ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const }
        : {}),
      ...(timeZone ? { timeZone } : {}),
    });
    formatterCache.set(key, formatter);
  }
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return parts;
}

/** Formats a date as `dd/MM/yyyy`. Invalid / empty input returns `""`. */
export function formatDate(
  value: DateInput,
  options: FrenchDateOptions = {},
): string {
  const date = toValidDate(value);
  if (!date) return '';
  const p = getParts(date, false, options.timeZone);
  return `${p.day}/${p.month}/${p.year}`;
}

/** Formats a date as `dd/MM/yyyy HH:mm`. Invalid / empty input returns `""`. */
export function formatDateTime(
  value: DateInput,
  options: FrenchDateOptions = {},
): string {
  const date = toValidDate(value);
  if (!date) return '';
  const p = getParts(date, true, options.timeZone);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
