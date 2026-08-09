import type { TranslationKey } from '../../lib/i18n';
import type { AnyReportFilter, PdfBadgeTone, PdfReportSpec } from './analytics.interface';

/** The `t` function from LanguageContext, matched exactly on its key union. */
type Translate = (key: TranslationKey) => string;

/**
 * Badge tones for order statuses. Matched case-insensitively server-side, so
 * the stored lowercase values and any display casing both resolve.
 */
export const ORDER_STATUS_TONES: Record<string, PdfBadgeTone> = {
  DRAFT: 'neutral',
  VALIDATED: 'info',
  IN_PROGRESS: 'warning',
  CONFIRMED: 'info',
  PICKED_UP: 'info',
  DELIVERED: 'positive',
  INVOICED: 'positive',
  CANCELLED: 'negative',
};

/** Badge tones for invoice statuses. */
export const INVOICE_STATUS_TONES: Record<string, PdfBadgeTone> = {
  DRAFT: 'neutral',
  UNPAID: 'negative',
  PARTIAL: 'warning',
  PAID: 'positive',
};

/** Preset value → translation key, mirroring ReportFilterBar's options. */
const PRESET_LABEL_KEYS: Record<string, TranslationKey> = {
  today: 'analyticsPresetToday',
  yesterday: 'analyticsPresetToday',
  this_week: 'analyticsPresetThisWeek',
  this_month: 'analyticsPresetThisMonth',
  last_month: 'analyticsPresetLastMonth',
  this_quarter: 'analyticsPresetThisQuarter',
  this_year: 'analyticsPresetThisYear',
  custom: 'analyticsPresetCustom',
};

/**
 * Describes the active filter as chips printed under the PDF title, so a
 * printed report always states the criteria it was produced under.
 */
export function buildPdfMeta(filter: AnyReportFilter, t: Translate): PdfReportSpec['meta'] {
  const meta: NonNullable<PdfReportSpec['meta']> = [];

  // Filter shapes differ per report; read the fields dynamically.
  const { asOfDate, preset, startDate, endDate } = filter as Record<string, string | undefined>;

  if (asOfDate) {
    meta.push({ label: t('analyticsPdfPeriod'), value: asOfDate });
    return meta;
  }

  if (preset === 'custom' && (startDate || endDate)) {
    meta.push({
      label: t('analyticsPdfPeriod'),
      value: `${startDate ?? '…'} → ${endDate ?? '…'}`,
    });
  } else if (preset) {
    const key = PRESET_LABEL_KEYS[preset];
    if (key) meta.push({ label: t('analyticsPdfPeriod'), value: t(key) });
  }

  return meta.length ? meta : undefined;
}

/**
 * Fills in the parts of a PDF spec that are identical on every report page —
 * criteria chips, footer notice and empty-state message.
 *
 * A page only declares what is specific to it: the report key, its translated
 * title and its columns.
 */
export function buildPdfSpec(
  spec: PdfReportSpec,
  filter: AnyReportFilter,
  t: Translate,
): PdfReportSpec {
  return {
    emptyMessage: t('analyticsPdfEmpty'),
    footerNote: t('analyticsPdfFooterNote'),
    ...spec,
    meta: spec.meta ?? buildPdfMeta(filter, t),
  };
}
