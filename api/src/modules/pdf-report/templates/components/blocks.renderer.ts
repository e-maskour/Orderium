import {
  PdfReportError,
  ReportBlock,
  ReportFormatter,
  ResolvedReportConfig,
  SectionBlock,
} from '../../types';
import { escapeHtml, when } from '../../core/html.util';
import { renderTable } from './data-table.component';
import { renderKpiGrid } from './kpi-grid.component';
import { renderKeyValues } from './key-values.component';

/**
 * Recursive block dispatcher — the only place that knows how each block kind
 * becomes HTML.
 *
 * Adding a *block kind* is a change here; adding a *report type* is not, which
 * is the split the module's extensibility rests on.
 */
export function renderBlock(
  block: ReportBlock,
  config: ResolvedReportConfig,
  format: ReportFormatter,
): string {
  switch (block.kind) {
    case 'table':
      return renderTable(block, config, format);

    case 'kpi-grid':
      return renderKpiGrid(block, format);

    case 'key-values':
      return renderKeyValues(block, format);

    case 'text':
      return `<p class="text-block${block.muted ? ' text-block--muted' : ''}">${escapeHtml(
        block.text,
      )}</p>`;

    case 'section':
      return renderSection(block, config, format);

    case 'spacer':
      return `<div style="height:${Math.max(0, block.size ?? 12)}px"></div>`;

    case 'page-break':
      return '<div class="page-break"></div>';

    case 'html':
      // Trusted by contract: the mapper that produced it owns its escaping.
      return block.html;

    default: {
      const unknown = block as { kind?: string };
      throw new PdfReportError(
        `Unsupported report block kind: "${unknown.kind ?? typeof block}"`,
      );
    }
  }
}

/** Titled group with a heading rule and nested blocks. */
function renderSection(
  block: SectionBlock,
  config: ResolvedReportConfig,
  format: ReportFormatter,
): string {
  const body = block.blocks
    .map((child) => renderBlock(child, config, format))
    .join('\n');

  return `
    <section class="section${block.breakBefore ? ' section--break-before' : ''}">
      <div class="section-head">
        <h2 class="section-title">${escapeHtml(block.title)}</h2>
        ${when(
          block.description,
          () => `<p class="section-desc">${escapeHtml(block.description)}</p>`,
        )}
      </div>
      <div class="section-body">${body}</div>
    </section>`;
}

/** Renders an ordered list of blocks. */
export function renderBlocks(
  blocks: ReportBlock[],
  config: ResolvedReportConfig,
  format: ReportFormatter,
): string {
  return blocks.map((block) => renderBlock(block, config, format)).join('\n');
}
