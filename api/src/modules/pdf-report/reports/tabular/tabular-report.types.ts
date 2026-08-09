import { CellAlign, CellFormat, Tone } from '../../types';

/**
 * Payload for the `tabular-report` type.
 *
 * Every analytics report in the app returns the same envelope — KPIs, rows and
 * pagination metadata — while the presentation (translated headers, column
 * order, number formats) lives in the client that renders the table. This
 * report type takes the two halves separately: the caller supplies the
 * *presentation spec*, the server supplies the *data*.
 *
 * That split means all 31 analytics reports render through one mapper, and no
 * column definition or translated label is duplicated server-side.
 */

/** One column of the report table. `key` indexes into each data row. */
export interface TabularColumnSpec {
  key: string;
  header: string;
  format?: CellFormat;
  align?: CellAlign;
  width?: string;
  emphasis?: boolean;
  /** Colour negative values. */
  signed?: boolean;
  /** Render values as badges, mapping raw value → tone. */
  badgeMap?: Record<string, Tone>;
  /** Include this column in the totals row, summing it across all rows. */
  total?: boolean;
}

/** One headline figure, resolved from the report's `kpis` object. */
export interface TabularKpiSpec {
  /** Key inside the report's `kpis` object. */
  key: string;
  label: string;
  format?: CellFormat;
  hint?: string;
}

/** Presentation spec supplied by the caller. */
export interface TabularReportSpec {
  title: string;
  subtitle?: string;
  /** Criteria chips printed under the title (period, warehouse, …). */
  meta?: Array<{ label: string; value: string }>;
  columns: TabularColumnSpec[];
  kpis?: TabularKpiSpec[];
  /** Heading for the table section. Omit to render the table untitled. */
  tableTitle?: string;
  /** Message shown when the report returns no rows. */
  emptyMessage?: string;
  /** Note printed under the table. */
  note?: string;
}

/** The report envelope produced by every analytics service. */
export interface TabularReportData {
  kpis?: Record<string, number | string | null | undefined>;
  rows: Array<Record<string, unknown>>;
  meta?: { total?: number; page?: number; perPage?: number };
}

/** What {@link TabularReportMapper} consumes. */
export interface TabularReportPayload {
  spec: TabularReportSpec;
  data: TabularReportData;
  /**
   * Total rows matched by the filter. When it exceeds `data.rows.length` the
   * mapper prints a truncation note so a capped export is never mistaken for a
   * complete one.
   */
  totalRowCount?: number;
}
