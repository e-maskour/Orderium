/**
 * Branding primitives — everything that identifies the tenant on a report.
 *
 * Branding is passed in per report (usually resolved from tenant
 * configuration) so a single engine can render for any tenant.
 */

/** Company logo, supplied either as a remote URL or as inline base64 data. */
export interface ReportLogo {
  /** Absolute URL the rendering engine can fetch (https recommended). */
  url?: string;
  /** Raw base64 payload (no `data:` prefix) — used when `url` is absent. */
  base64?: string;
  /** MIME type for the base64 payload. Defaults to `image/png`. */
  mimeType?: string;
  /** Rendered width in CSS pixels. Height is derived from the aspect ratio. */
  widthPx?: number;
  /** Alt text for accessibility / when the image fails to load. */
  alt?: string;
}

/** Postal address block shown in the page header. */
export interface ReportAddress {
  line1?: string;
  line2?: string;
  zipCode?: string;
  city?: string;
  country?: string;
}

/** Contact details shown in the page header. */
export interface ReportContact {
  phone?: string;
  email?: string;
  website?: string;
}

/**
 * Legal / fiscal identifiers. Keys are intentionally generic; the label for
 * each one is provided by {@link ReportLabels} so the module stays
 * jurisdiction-agnostic.
 */
export interface ReportIdentifiers {
  /** Tax identification number (Morocco: IF). */
  taxId?: string;
  /** VAT number (Morocco: TVA). */
  vatNumber?: string;
  /** Trade register number (Morocco: RC). */
  registrationNumber?: string;
  /** Common company identifier (Morocco: ICE). */
  commonCompanyId?: string;
}

/**
 * Design tokens. Every visual decision in the base template resolves to one of
 * these, so a tenant can re-skin reports without touching the templates.
 */
export interface ReportTheme {
  /** Brand colour — section rules, table headers, KPI accents. */
  primary: string;
  /** Darker brand shade — headings and strong emphasis. */
  primaryDark: string;
  /** Secondary highlight — KPI deltas, badges. */
  accent: string;
  /** Strongest text colour (titles). */
  textStrong: string;
  /** Default body text colour. */
  textBase: string;
  /** De-emphasised text (captions, footer, labels). */
  textMuted: string;
  /** Hairline / divider colour. */
  border: string;
  /** Card and table surface colour. */
  surface: string;
  /** Zebra stripe / subtle fill colour. */
  surfaceAlt: string;
  /** Page background. */
  background: string;
  /** Positive figure colour (gains, credits). */
  positive: string;
  /** Negative figure colour (losses, debits). */
  negative: string;
  /** CSS font stack. */
  fontFamily: string;
  /**
   * Optional absolute URL of a stylesheet declaring web fonts (e.g. a Google
   * Fonts href). Injected as a `<link>` so the render engine loads it.
   */
  fontUrl?: string;
  /** Base body font size in points. */
  baseFontSizePt: number;
  /** Corner radius in pixels for cards and tables. */
  radiusPx: number;
}

/**
 * Full tenant branding for a report. Only `companyName` is required — every
 * other block degrades gracefully when omitted.
 */
export interface CompanyBranding {
  companyName: string;
  /** Optional tagline rendered under the company name. */
  tagline?: string;
  logo?: ReportLogo;
  address?: ReportAddress;
  contact?: ReportContact;
  identifiers?: ReportIdentifiers;
  /** Partial theme overrides merged over {@link DEFAULT_REPORT_THEME}. */
  theme?: Partial<ReportTheme>;
}

/** Branding with the theme fully resolved (no optional theme fields left). */
export interface ResolvedBranding extends Omit<CompanyBranding, 'theme'> {
  theme: ReportTheme;
}

/**
 * Modern, neutral default palette. Slate neutrals with an indigo brand accent —
 * high contrast in print, no reliance on colour alone to convey meaning.
 */
export const DEFAULT_REPORT_THEME: ReportTheme = {
  primary: '#2563eb',
  primaryDark: '#1e3a8a',
  accent: '#0ea5e9',
  textStrong: '#0f172a',
  textBase: '#334155',
  textMuted: '#64748b',
  border: '#e2e8f0',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  background: '#ffffff',
  positive: '#047857',
  negative: '#b91c1c',
  fontFamily:
    "'Inter', 'Helvetica Neue', Helvetica, Arial, 'Noto Sans', 'Noto Sans Arabic', sans-serif",
  baseFontSizePt: 9,
  radiusPx: 8,
};

/** Merges tenant theme overrides over the defaults. */
export function resolveTheme(overrides?: Partial<ReportTheme>): ReportTheme {
  if (!overrides) return { ...DEFAULT_REPORT_THEME };
  const merged: ReportTheme = { ...DEFAULT_REPORT_THEME };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined && value !== null && value !== '') {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}
