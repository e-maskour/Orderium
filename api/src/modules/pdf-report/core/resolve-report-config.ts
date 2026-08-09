import {
  DEFAULT_PAGE_SETUP,
  DEFAULT_REPORT_LABELS,
  ReportConfig,
  ReportMapper,
  ResolvedReportConfig,
  resolveTheme,
} from '../types';

/** Module-wide fallbacks, aligned with Morocom's primary market. */
export const REPORT_DEFAULTS = {
  locale: 'fr-MA',
  currency: 'MAD',
  timeZone: 'Africa/Casablanca',
} as const;

/** Turns `sales-summary` into `Sales summary` for a last-resort title. */
function humanise(reportType: string): string {
  const spaced = reportType.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Strips characters that are unsafe in a `Content-Disposition` file name. */
export function sanitiseFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w\-. ]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 120);
  return cleaned || 'report';
}

/**
 * Applies defaults, merges the mapper's page preference, and resolves the
 * theme — producing the single object every template reads from.
 *
 * Precedence for page setup: caller config > mapper preference > module default.
 */
export function resolveReportConfig(
  config: ReportConfig,
  mapper?: Pick<ReportMapper<any>, 'defaultTitle' | 'pagePreference'>,
): ResolvedReportConfig {
  const generatedAt = config.generatedAt ?? new Date();
  const title =
    config.title?.trim() || mapper?.defaultTitle || humanise(config.reportType);

  const page = {
    format:
      config.page?.format ??
      mapper?.pagePreference?.format ??
      DEFAULT_PAGE_SETUP.format,
    landscape:
      config.page?.landscape ??
      mapper?.pagePreference?.landscape ??
      DEFAULT_PAGE_SETUP.landscape,
    margins: { ...DEFAULT_PAGE_SETUP.margins, ...(config.page?.margins ?? {}) },
  };

  const datePart = generatedAt.toISOString().slice(0, 10);
  const fileName = sanitiseFileName(
    config.fileName?.trim() || `${config.reportType}-${datePart}`,
  );

  return {
    reportType: config.reportType,
    title,
    subtitle: config.subtitle?.trim() || undefined,
    branding: {
      ...config.branding,
      theme: resolveTheme(config.branding.theme),
    },
    theme: resolveTheme(config.branding.theme),
    page,
    footer: {
      note: config.footer?.note,
      showPageNumbers: config.footer?.showPageNumbers ?? true,
      showGeneratedAt: config.footer?.showGeneratedAt ?? true,
    },
    meta: config.meta ?? [],
    locale: config.locale || REPORT_DEFAULTS.locale,
    currency: config.currency || REPORT_DEFAULTS.currency,
    timeZone: config.timeZone || REPORT_DEFAULTS.timeZone,
    direction: config.direction ?? 'ltr',
    generatedAt,
    fileName,
    pageNumbering: config.pageNumbering ?? 'native',
    labels: { ...DEFAULT_REPORT_LABELS, ...(config.labels ?? {}) },
  };
}
