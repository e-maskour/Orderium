/**
 * The intermediate document model.
 *
 * A report mapper turns raw domain data into these blocks; the engine turns
 * blocks into HTML. Mappers never emit HTML and templates never touch domain
 * data — that separation is what makes a new report type a mapper-only change.
 */

/** Built-in cell formatters applied by the table component. */
export type CellFormat =
  | 'text'
  | 'number'
  | 'integer'
  | 'currency'
  | 'percent'
  | 'date'
  | 'datetime';

export type CellAlign = 'left' | 'center' | 'right';

/** Semantic tone used for badges and signed figures. */
export type Tone = 'neutral' | 'positive' | 'negative' | 'warning' | 'info';

/** A single table column definition. */
export interface TableColumn {
  /** Key looked up on each row object. */
  key: string;
  /** Column header text. */
  header: string;
  /** Formatter applied to the raw value. Defaults to `text`. */
  format?: CellFormat;
  /**
   * Horizontal alignment. Defaults to `right` for numeric formats and `left`
   * otherwise.
   */
  align?: CellAlign;
  /** Column width as a CSS value (`'18%'`, `'90px'`). Optional. */
  width?: string;
  /** Renders the column's cells in a heavier weight. */
  emphasis?: boolean;
  /** Colours negative values with the theme's negative colour. */
  signed?: boolean;
  /** Renders the value as a badge pill; the function picks the tone. */
  badgeTone?: (value: unknown, row: TableRow) => Tone;
  /** Text shown when the value is `null`/`undefined`/`''`. Defaults to `—`. */
  emptyValue?: string;
}

/** A table row. Values are raw — formatting happens at render time. */
export type TableRow = Record<string, unknown>;

/** Tabular block with optional totals row. */
export interface TableBlock {
  kind: 'table';
  columns: TableColumn[];
  rows: TableRow[];
  /** Optional pinned totals row, rendered with a strong top rule. */
  totals?: TableRow;
  /** Label placed in the first totals cell when it has no value. */
  totalsLabel?: string;
  /** Alternating row shading. Defaults to `true`. */
  zebra?: boolean;
  /** Caption printed above the table. */
  caption?: string;
  /** Small note printed under the table. */
  note?: string;
  /** Message shown instead of an empty table body. */
  emptyMessage?: string;
  /** Repeat the header row on every page the table spans. Defaults to `true`. */
  repeatHeader?: boolean;
}

/** A single KPI / summary card. */
export interface KpiCard {
  label: string;
  /** Raw value; formatted with `format` when it is numeric. */
  value: string | number;
  format?: CellFormat;
  /** Secondary line under the value (comparison, share, count). */
  hint?: string;
  /** Signed delta rendered as a coloured badge, e.g. `+12.4%`. */
  delta?: { value: string; tone: Tone };
  /** Left accent bar colour override; defaults to the theme primary. */
  accent?: string;
}

/** Responsive grid of KPI cards. */
export interface KpiGridBlock {
  kind: 'kpi-grid';
  cards: KpiCard[];
  /** Cards per row. Defaults to `4` (clamped to 1–6). */
  columns?: number;
}

/** Label/value definition list — good for parameters and totals summaries. */
export interface KeyValuesBlock {
  kind: 'key-values';
  items: Array<{
    label: string;
    value: string | number;
    format?: CellFormat;
    emphasis?: boolean;
  }>;
  /** Pairs per row. Defaults to `3`. */
  columns?: number;
}

/** Paragraph of plain text (escaped). */
export interface TextBlock {
  kind: 'text';
  text: string;
  /** De-emphasised styling for notes and disclaimers. */
  muted?: boolean;
}

/** Titled group of nested blocks. */
export interface SectionBlock {
  kind: 'section';
  title: string;
  description?: string;
  blocks: ReportBlock[];
  /** Force a page break before this section. */
  breakBefore?: boolean;
}

/** Vertical spacing. */
export interface SpacerBlock {
  kind: 'spacer';
  /** Height in pixels. Defaults to `12`. */
  size?: number;
}

/** Explicit page break. */
export interface PageBreakBlock {
  kind: 'page-break';
}

/**
 * Escape hatch for a report-specific partial (a chart image, a signature
 * block…). The HTML is inserted verbatim — the mapper owns its safety.
 */
export interface HtmlBlock {
  kind: 'html';
  html: string;
}

/** Union of every renderable block. */
export type ReportBlock =
  | TableBlock
  | KpiGridBlock
  | KeyValuesBlock
  | TextBlock
  | SectionBlock
  | SpacerBlock
  | PageBreakBlock
  | HtmlBlock;

/** What a mapper returns: the body of the report. */
export interface ReportDocument {
  /** Overrides `ReportConfig.title` when the config leaves it blank. */
  title?: string;
  /** Overrides `ReportConfig.subtitle` when the config leaves it blank. */
  subtitle?: string;
  /** Optional lead paragraph printed under the title block. */
  summary?: string;
  /** Ordered content. */
  blocks: ReportBlock[];
}
