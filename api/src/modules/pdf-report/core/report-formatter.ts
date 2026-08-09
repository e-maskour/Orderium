import { CellFormat, ReportFormatter } from '../types';
import { toText } from './html.util';

/** Options needed to build a locale-aware formatter. */
export interface FormatterOptions {
  locale: string;
  currency: string;
  timeZone: string;
}

/** Coerces mixed SQL/JSON input (string decimals, `null`) to a finite number. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

/** Coerces mixed input to a valid `Date`, or `null`. */
function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * `Intl` instances are expensive to construct, so each formatter caches its
 * own by option signature. One formatter is built per report.
 */
export function createReportFormatter(
  options: FormatterOptions,
): ReportFormatter {
  const { locale, currency, timeZone } = options;
  const numberCache = new Map<string, Intl.NumberFormat>();
  const dateCache = new Map<string, Intl.DateTimeFormat>();

  const numberFormat = (opts: Intl.NumberFormatOptions): Intl.NumberFormat => {
    const key = JSON.stringify(opts);
    let formatter = numberCache.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, opts);
      numberCache.set(key, formatter);
    }
    return formatter;
  };

  const dateFormat = (
    opts: Intl.DateTimeFormatOptions,
  ): Intl.DateTimeFormat => {
    const key = JSON.stringify(opts);
    let formatter = dateCache.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, { timeZone, ...opts });
      dateCache.set(key, formatter);
    }
    return formatter;
  };

  const formatter: ReportFormatter = {
    number(value, fractionDigits = 2) {
      const num = toNumber(value);
      if (num === null) return '';
      return numberFormat({
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(num);
    },

    integer(value) {
      const num = toNumber(value);
      if (num === null) return '';
      return numberFormat({ maximumFractionDigits: 0 }).format(num);
    },

    currency(value, fractionDigits = 2) {
      const num = toNumber(value);
      if (num === null) return '';
      return numberFormat({
        style: 'currency',
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(num);
    },

    percent(value, fractionDigits = 1) {
      const num = toNumber(value);
      if (num === null) return '';
      // Input is already expressed in percent, so divide before formatting.
      return numberFormat({
        style: 'percent',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(num / 100);
    },

    date(value) {
      const date = toDate(value);
      if (!date) return '';
      return dateFormat({
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    },

    dateTime(value) {
      const date = toDate(value);
      if (!date) return '';
      return dateFormat({
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    },

    apply(value, format: CellFormat = 'text') {
      switch (format) {
        case 'number':
          return formatter.number(value);
        case 'integer':
          return formatter.integer(value);
        case 'currency':
          return formatter.currency(value);
        case 'percent':
          return formatter.percent(value);
        case 'date':
          return formatter.date(value);
        case 'datetime':
          return formatter.dateTime(value);
        case 'text':
        default:
          return toText(value);
      }
    },
  };

  return formatter;
}
