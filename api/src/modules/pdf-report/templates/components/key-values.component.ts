import { KeyValuesBlock, ReportFormatter } from '../../types';
import { escapeHtml } from '../../core/html.util';

const DEFAULT_COLUMNS = 3;

/** Label/value definition grid — parameters, assumptions, totals summaries. */
export function renderKeyValues(
  block: KeyValuesBlock,
  format: ReportFormatter,
): string {
  if (block.items.length === 0) return '';

  const columns = Math.max(
    1,
    Math.min(block.columns ?? DEFAULT_COLUMNS, block.items.length),
  );

  const items = block.items
    .map((item) => {
      const value =
        typeof item.value === 'number' || item.format
          ? format.apply(item.value, item.format ?? 'number')
          : String(item.value);

      return `
        <div>
          <div class="kv-label">${escapeHtml(item.label)}</div>
          <div class="kv-value${item.emphasis ? ' kv-value--emphasis' : ''}">${escapeHtml(value)}</div>
        </div>`;
    })
    .join('');

  return `<div class="kv-grid" style="grid-template-columns:repeat(${columns}, 1fr);">${items}</div>`;
}
