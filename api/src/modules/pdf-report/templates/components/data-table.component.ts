import {
  CellAlign,
  ReportFormatter,
  ResolvedReportConfig,
  TableBlock,
  TableColumn,
  TableRow,
  Tone,
} from '../../types';
import { escapeHtml, joinHtml, when } from '../../core/html.util';

/** Numeric formats default to end-alignment; text stays start-aligned. */
function defaultAlign(column: TableColumn): CellAlign {
  if (column.align) return column.align;
  switch (column.format) {
    case 'number':
    case 'integer':
    case 'currency':
    case 'percent':
      return 'right';
    default:
      return 'left';
  }
}

/** `signed` columns colour negatives; positives stay neutral to avoid noise. */
function signClass(column: TableColumn, value: unknown): string {
  if (!column.signed) return '';
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return '';
  return num < 0 ? ' cell-negative' : ' cell-positive';
}

function renderBadge(value: string, tone: Tone): string {
  return `<span class="badge badge--${tone}">${escapeHtml(value)}</span>`;
}

/** Renders one `<td>`, applying the column's format, alignment, and styling. */
function renderCell(
  column: TableColumn,
  row: TableRow,
  format: ReportFormatter,
): string {
  const raw = row[column.key];
  const isEmpty = raw === null || raw === undefined || raw === '';
  const text = isEmpty
    ? (column.emptyValue ?? '—')
    : format.apply(raw, column.format);

  const classes = [
    `align-${defaultAlign(column)}`,
    column.emphasis ? 'cell-emphasis' : '',
    signClass(column, raw).trim(),
  ]
    .filter(Boolean)
    .join(' ');

  const content =
    column.badgeTone && !isEmpty
      ? renderBadge(text, column.badgeTone(raw, row))
      : escapeHtml(text);

  return `<td class="${classes}">${content}</td>`;
}

/**
 * Data table with zebra striping, a repeating header, sticky-safe page breaks
 * and an optional totals row.
 *
 * `<thead>` is emitted even for an empty result set so the columns still
 * document what the report covers.
 */
export function renderTable(
  block: TableBlock,
  config: ResolvedReportConfig,
  format: ReportFormatter,
): string {
  const zebra = block.zebra ?? true;
  const repeatHeader = block.repeatHeader ?? true;

  const caption = when(
    block.caption,
    () => `<div class="table-caption">${escapeHtml(block.caption)}</div>`,
  );
  const note = when(
    block.note,
    () => `<div class="table-note">${escapeHtml(block.note)}</div>`,
  );

  if (block.rows.length === 0) {
    return joinHtml([
      '<div class="table-wrap">',
      caption,
      `<div class="table-empty">${escapeHtml(
        block.emptyMessage || config.labels.noData,
      )}</div>`,
      note,
      '</div>',
    ]);
  }

  const head = `
    <thead${repeatHeader ? ' style="display:table-header-group;"' : ''}>
      <tr>
        ${block.columns
          .map(
            (column) =>
              `<th class="align-${defaultAlign(column)}"${
                column.width ? ` style="width:${escapeHtml(column.width)}"` : ''
              }>${escapeHtml(column.header)}</th>`,
          )
          .join('')}
      </tr>
    </thead>`;

  const body = `
    <tbody>
      ${block.rows
        .map(
          (row) =>
            `<tr>${block.columns
              .map((column) => renderCell(column, row, format))
              .join('')}</tr>`,
        )
        .join('')}
    </tbody>`;

  const foot = when(block.totals, () => {
    const totals = block.totals as TableRow;
    const cells = block.columns.map((column, index) => {
      const raw = totals[column.key];
      const hasValue = raw !== null && raw !== undefined && raw !== '';

      // The first empty cell carries the "Total" label so the row reads
      // correctly even when the leading column holds no figure.
      if (!hasValue && index === 0) {
        return `<td class="align-${defaultAlign(column)}">${escapeHtml(
          block.totalsLabel || config.labels.total,
        )}</td>`;
      }

      return `<td class="align-${defaultAlign(column)}${signClass(column, raw)}">${escapeHtml(
        hasValue ? format.apply(raw, column.format) : '',
      )}</td>`;
    });
    return `<tfoot><tr>${cells.join('')}</tr></tfoot>`;
  });

  return joinHtml([
    '<div class="table-wrap">',
    caption,
    `<table class="data${zebra ? ' zebra' : ''}">`,
    head,
    body,
    foot,
    '</table>',
    note,
    '</div>',
  ]);
}
