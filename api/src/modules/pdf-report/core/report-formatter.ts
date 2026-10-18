import { CellFormat, ReportFormatter } from '../types';
import { toText } from './html.util';
import {
  formatAmount,
  formatDate,
  formatDateTime,
} from '../../../common/utils/french-format';

/** Options needed to build a report formatter. */
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
 * Currency label for a report: the symbol follows the report language
 * (`MAD` in French, `د.م.` in Arabic) while the digits themselves are always
 * formatted the French way via {@link formatAmount}.
 */
function resolveCurrencyLabel(locale: string, currency: string): string {
  try {
    const part = new Intl.NumberFormat(locale, { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    // Strip bidi control marks some locales (e.g. ar-MA) wrap symbols with.
    const label = part?.value.replace(/[\u200e\u200f\u061c]/g, '').trim();
    return label || currency;
  } catch {
    return currency;
  }
}

/**
 * Numbers and numeric dates are always rendered in French format
 * ("1.234,56", "31/01/2026 14:05") regardless of the report locale; the
 * locale only drives text such as the currency label. One formatter is
 * built per report.
 */
export function createReportFormatter(
  options: FormatterOptions,
): ReportFormatter {
  const { locale, currency, timeZone } = options;
  const currencyLabel = resolveCurrencyLabel(locale, currency);

  const formatter: ReportFormatter = {
    number(value, fractionDigits = 2) {
      const num = toNumber(value);
      if (num === null) return '';
      return formatAmount(num, fractionDigits);
    },

    integer(value) {
      const num = toNumber(value);
      if (num === null) return '';
      return formatAmount(num, 0);
    },

    currency(value, fractionDigits = 2) {
      const num = toNumber(value);
      if (num === null) return '';
      return `${formatAmount(num, fractionDigits)} ${currencyLabel}`;
    },

    percent(value, fractionDigits = 1) {
      const num = toNumber(value);
      if (num === null) return '';
      // Input is already expressed in percent.
      return `${formatAmount(num, fractionDigits)} %`;
    },

    date(value) {
      const date = toDate(value);
      if (!date) return '';
      return formatDate(date, { timeZone });
    },

    dateTime(value) {
      const date = toDate(value);
      if (!date) return '';
      return formatDateTime(date, { timeZone });
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
