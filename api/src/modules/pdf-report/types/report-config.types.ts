import {
  CompanyBranding,
  ResolvedBranding,
  ReportTheme,
} from './branding.types';

/** Paper sizes supported by the layout stylesheet. */
export type PageFormat = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal';

/** Page geometry. Margin values are CSS lengths (`'18mm'`, `'0.75in'`, …). */
export interface PageSetup {
  format: PageFormat;
  landscape: boolean;
  margins: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

/**
 * How running page numbers are produced.
 *
 * - `native` — the header/footer HTML is handed to the PDF API as a separate
 *   template. Chromium-backed services substitute `.pageNumber` / `.totalPages`
 *   spans. This is the default and works with every mainstream HTML-to-PDF API.
 * - `css-paged` — the header/footer are rendered as fixed running elements
 *   inside the document and page numbers come from the CSS `counter(page)` /
 *   `counter(pages)` counters. Use this with paged-media engines (PrinceXML,
 *   WeasyPrint, Vivliostyle).
 */
export type PageNumberingStrategy = 'native' | 'css-paged';

/** Footer content shown on every page. */
export interface FooterConfig {
  /**
   * Free-text line, e.g. a confidentiality notice. Rendered on the left of the
   * footer on every page.
   */
  note?: string;
  /** Render "Page X of Y". Defaults to `true`. */
  showPageNumbers?: boolean;
  /** Render the generation timestamp. Defaults to `true`. */
  showGeneratedAt?: boolean;
}

/**
 * Localisable labels. Supplying a partial object overrides only the keys given,
 * which keeps the module free of a translation dependency.
 */
export interface ReportLabels {
  generatedAt: string;
  page: string;
  pageOf: string;
  taxId: string;
  vatNumber: string;
  registrationNumber: string;
  commonCompanyId: string;
  phone: string;
  email: string;
  website: string;
  total: string;
  noData: string;
  continued: string;
}

/** Default (French) labels — Morocom's primary back-office language. */
export const DEFAULT_REPORT_LABELS: ReportLabels = {
  generatedAt: 'Généré le',
  page: 'Page',
  pageOf: 'sur',
  taxId: 'IF',
  vatNumber: 'TVA',
  registrationNumber: 'RC',
  commonCompanyId: 'ICE',
  phone: 'Tél',
  email: 'Email',
  website: 'Web',
  total: 'Total',
  noData: 'Aucune donnée pour cette période.',
  continued: 'suite',
};

/** A filter/criterion chip printed under the report title. */
export interface ReportMetaItem {
  label: string;
  value: string;
}

/**
 * Everything the engine needs besides the data itself.
 *
 * `reportType` selects the registered mapper; adding a report type means
 * registering a new mapper, never editing the engine.
 */
export interface ReportConfig {
  /** Registered mapper key, e.g. `'sales-summary'`. */
  reportType: string;
  /** Main title. Falls back to the mapper's document title when omitted. */
  title?: string;
  /** Optional sub-title under the title. */
  subtitle?: string;
  /** Tenant branding (header content + theme). */
  branding: CompanyBranding;
  /** Page geometry overrides. */
  page?: Partial<PageSetup>;
  /** Footer overrides. */
  footer?: FooterConfig;
  /** Filter chips describing the report criteria (period, warehouse, …). */
  meta?: ReportMetaItem[];
  /** BCP-47 locale used for number/date formatting. Defaults to `fr-MA`. */
  locale?: string;
  /** ISO-4217 currency for currency-formatted columns. Defaults to `MAD`. */
  currency?: string;
  /** IANA time zone for date formatting. Defaults to `Africa/Casablanca`. */
  timeZone?: string;
  /** Text direction. Defaults to `ltr`. */
  direction?: 'ltr' | 'rtl';
  /** Generation timestamp shown in the footer. Defaults to `new Date()`. */
  generatedAt?: Date;
  /** Suggested download file name (without extension). */
  fileName?: string;
  /** Page-number strategy. Defaults to `native`. */
  pageNumbering?: PageNumberingStrategy;
  /** Label overrides. */
  labels?: Partial<ReportLabels>;
}

/** Config after defaults have been applied — what templates actually consume. */
export interface ResolvedReportConfig {
  reportType: string;
  title: string;
  subtitle?: string;
  branding: ResolvedBranding;
  theme: ReportTheme;
  page: PageSetup;
  footer: Required<Pick<FooterConfig, 'showPageNumbers' | 'showGeneratedAt'>> &
    Pick<FooterConfig, 'note'>;
  meta: ReportMetaItem[];
  locale: string;
  currency: string;
  timeZone: string;
  direction: 'ltr' | 'rtl';
  generatedAt: Date;
  fileName: string;
  pageNumbering: PageNumberingStrategy;
  labels: ReportLabels;
}

/** Result returned by the engine. */
export interface GeneratedReport {
  /** Raw PDF bytes. */
  buffer: Buffer;
  /** File name including the `.pdf` extension. */
  fileName: string;
  /** Always `application/pdf`. */
  contentType: 'application/pdf';
  /** Byte length of {@link buffer} — convenient for `Content-Length`. */
  byteLength: number;
}

/** Default page geometry: A4 portrait with room for the running header/footer. */
export const DEFAULT_PAGE_SETUP: PageSetup = {
  format: 'A4',
  landscape: false,
  margins: { top: '34mm', right: '12mm', bottom: '20mm', left: '12mm' },
};
