export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export interface ReportFilter {
  preset?: DatePreset;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

export interface SalesReportFilter extends ReportFilter {
  warehouseId?: number;
  categoryId?: number;
  partnerId?: number;
}

export interface StockReportFilter extends ReportFilter {
  warehouseId?: number;
  categoryId?: number;
}

export interface AgingReportFilter {
  asOfDate?: string;
  page?: number;
  perPage?: number;
}

export interface PartnerStatementFilter extends ReportFilter {
  partnerId?: number;
}

export interface ReportKpi {
  label: string;
  value: number | string;
  suffix?: string;
  color?: 'green' | 'red' | 'blue' | 'orange' | 'purple';
}

export interface ReportChart {
  type: 'bar' | 'line' | 'pie' | 'area';
  labels: string[];
  series: { name: string; data: number[] }[] | number[];
}

export interface ReportMeta {
  total: number;
  page: number;
  perPage: number;
}

export interface ReportData<R = Record<string, unknown>> {
  kpis: Record<string, number | string>;
  chart: ReportChart | null;
  rows: R[];
  meta: ReportMeta | null;
}

/**
 * Any report filter shape.
 *
 * A union rather than `ReportFilter & Record<string, unknown>`: interfaces have
 * no implicit index signature, so the intersection would reject every concrete
 * filter type.
 */
export type AnyReportFilter =
  | ReportFilter
  | SalesReportFilter
  | StockReportFilter
  | AgingReportFilter
  | PartnerStatementFilter;

// ─── PDF export ──────────────────────────────────────────────

/** Cell formatters the PDF renderer understands. */
export type PdfCellFormat =
  | 'text'
  | 'number'
  | 'integer'
  | 'currency'
  | 'percent'
  | 'date'
  | 'datetime';

export type PdfCellAlign = 'left' | 'center' | 'right';

/** Badge colours available for status-style columns. */
export type PdfBadgeTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'info';

/**
 * One PDF table column.
 *
 * Mirrors the on-screen table column but carries a `format` instead of a React
 * `body` renderer — the PDF engine formats values server-side, so the spec must
 * be serialisable.
 */
export interface PdfReportColumn {
  key: string;
  header: string;
  format?: PdfCellFormat;
  align?: PdfCellAlign;
  width?: string;
  /** Render the column in a heavier weight. */
  emphasis?: boolean;
  /** Colour negative values red. */
  signed?: boolean;
  /** Sum this column into the table's totals row. */
  total?: boolean;
  /** Map raw cell value → badge tone. */
  badgeMap?: Record<string, PdfBadgeTone>;
}

/** One headline figure, resolved server-side from the report's `kpis` object. */
export interface PdfReportKpi {
  /** Key inside the report's `kpis` object. */
  key: string;
  label: string;
  format?: PdfCellFormat;
  hint?: string;
}

/**
 * Everything a report page declares about how its PDF should look.
 *
 * Deliberately presentation-only: the server re-runs the report query itself,
 * so no figure in the PDF originates here.
 */
export interface PdfReportSpec {
  /** Report identifier known to the API, e.g. `sales-revenue`. */
  reportKey: string;
  /** Translated report title. */
  title: string;
  subtitle?: string;
  /** Heading above the table. */
  tableTitle?: string;
  columns: PdfReportColumn[];
  kpis?: PdfReportKpi[];
  /** Criteria chips printed under the title. */
  meta?: Array<{ label: string; value: string }>;
  /** Message shown when the report returns no rows. */
  emptyMessage?: string;
  /** Landscape orientation — use for tables with many columns. */
  landscape?: boolean;
  /** Confidentiality line in the page footer. */
  footerNote?: string;
  /** Download file name, without the `.pdf` extension. */
  fileName?: string;
}
