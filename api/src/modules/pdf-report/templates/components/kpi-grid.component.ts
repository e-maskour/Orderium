import { KpiGridBlock, ReportFormatter } from '../../types';
import { escapeHtml, when } from '../../core/html.util';

/** Cards per row, clamped to what stays legible on A4/A3. */
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 6;
const DEFAULT_COLUMNS = 4;

/**
 * Grid of summary cards.
 *
 * Each card is `break-inside: avoid`, so a KPI never straddles a page boundary.
 */
export function renderKpiGrid(
  block: KpiGridBlock,
  format: ReportFormatter,
): string {
  if (block.cards.length === 0) return '';

  const requested = block.columns ?? DEFAULT_COLUMNS;
  const columns = Math.min(
    MAX_COLUMNS,
    Math.max(MIN_COLUMNS, requested),
    // Never stretch fewer cards across more tracks than exist.
    Math.max(MIN_COLUMNS, block.cards.length),
  );

  const cards = block.cards
    .map((card) => {
      const value =
        typeof card.value === 'number'
          ? format.apply(card.value, card.format ?? 'number')
          : card.format
            ? format.apply(card.value, card.format)
            : String(card.value);

      const accent = card.accent
        ? ` style="--kpi-accent:${escapeHtml(card.accent)}"`
        : '';

      return `
        <div class="kpi-card"${accent}>
          <div class="kpi-label">${escapeHtml(card.label)}</div>
          <div class="kpi-value">${escapeHtml(value)}</div>
          ${when(card.hint, () => `<div class="kpi-hint">${escapeHtml(card.hint)}</div>`)}
          ${when(
            card.delta,
            () =>
              `<div class="kpi-delta badge badge--${card.delta!.tone}">${escapeHtml(
                card.delta!.value,
              )}</div>`,
          )}
        </div>`;
    })
    .join('');

  return `<div class="kpi-grid" style="grid-template-columns:repeat(${columns}, 1fr);">${cards}</div>`;
}
