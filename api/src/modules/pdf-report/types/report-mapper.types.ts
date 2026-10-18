import { ResolvedReportConfig } from './report-config.types';
import { ReportDocument } from './report-document.types';
import { CellFormat } from './report-document.types';

/**
 * Locale-aware formatting helpers handed to mappers so every report renders
 * numbers and dates identically.
 */
export interface ReportFormatter {
  /** Decimal number in French format ("1.234,56"). */
  number(value: unknown, fractionDigits?: number): string;
  /** Whole number, no fraction digits. */
  integer(value: unknown): string;
  /** Amount in the configured currency. */
  currency(value: unknown, fractionDigits?: number): string;
  /** Percentage — input is already a percentage (`12.5` → `12,5 %`). */
  percent(value: unknown, fractionDigits?: number): string;
  /** Short date (dd/MM/yyyy) in the configured time zone. */
  date(value: unknown): string;
  /** Date + time (dd/MM/yyyy HH:mm) in the configured time zone. */
  dateTime(value: unknown): string;
  /** Applies the formatter matching a {@link CellFormat} token. */
  apply(value: unknown, format?: CellFormat): string;
}

/** Everything a mapper may consult while building its document. */
export interface ReportMapperContext {
  /** Config after defaults — locale, currency, branding, labels. */
  readonly config: ResolvedReportConfig;
  /** Locale-aware formatters. */
  readonly format: ReportFormatter;
}

/**
 * Contract for a report type.
 *
 * Implement this, register it, and the engine can render it. The engine has no
 * knowledge of any concrete report.
 *
 * @typeParam TData - the payload this report consumes.
 */
export interface ReportMapper<TData = unknown> {
  /** Unique key matched against `ReportConfig.reportType`. */
  readonly reportType: string;
  /** Title used when the caller does not supply one. */
  readonly defaultTitle?: string;
  /**
   * Optional page-setup preferences for this report (e.g. landscape for wide
   * tables). Caller-supplied `ReportConfig.page` still wins.
   */
  readonly pagePreference?: {
    landscape?: boolean;
    format?: ResolvedReportConfig['page']['format'];
  };
  /** Turns the payload into the intermediate document model. */
  map(data: TData, ctx: ReportMapperContext): ReportDocument;
}
