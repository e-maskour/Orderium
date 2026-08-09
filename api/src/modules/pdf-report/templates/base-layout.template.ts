import {
  ReportDocument,
  ReportFormatter,
  ResolvedReportConfig,
} from '../types';
import { escapeHtml, joinHtml, when } from '../core/html.util';
import { renderThemeStyles } from './theme.styles';
import { renderBlocks } from './components/blocks.renderer';
import { renderHeader, renderRunningHeaderStyles } from './header.template';
import { renderFooter, renderRunningFooterStyles } from './footer.template';

/** The header/footer fragments the engine forwards to the PDF API. */
export interface ComposedReportHtml {
  /** Complete standalone HTML document. */
  html: string;
  /** Header template — present only for the `native` strategy. */
  headerHtml?: string;
  /** Footer template — present only for the `native` strategy. */
  footerHtml?: string;
}

/**
 * Composes the full HTML document for a report.
 *
 * This is the one layout every report type shares: branded running header,
 * title block with criteria chips, the mapper's blocks, and a running footer
 * carrying the page number, generation date and confidentiality note.
 */
export function renderBaseLayout(
  document: ReportDocument,
  config: ResolvedReportConfig,
  format: ReportFormatter,
): ComposedReportHtml {
  const isCssPaged = config.pageNumbering === 'css-paged';

  const header = renderHeader(config, config.pageNumbering);
  const footer = renderFooter(config, config.pageNumbering);

  const runningStyles = isCssPaged
    ? renderRunningHeaderStyles(config) + renderRunningFooterStyles(config)
    : '';

  const fontLink = when(
    config.theme.fontUrl,
    () =>
      `<link rel="stylesheet" href="${escapeHtml(config.theme.fontUrl)}" />`,
  );

  const metaChips = when(
    config.meta.length > 0,
    () => `
      <div class="meta-chips">
        ${config.meta
          .map(
            (item) =>
              `<span class="meta-chip"><strong>${escapeHtml(item.label)}</strong>${escapeHtml(
                item.value,
              )}</span>`,
          )
          .join('')}
      </div>`,
  );

  const titleBlock = `
    <div class="title-block">
      <h1 class="doc-title">${escapeHtml(config.title)}</h1>
      ${when(
        config.subtitle,
        () => `<p class="doc-subtitle">${escapeHtml(config.subtitle)}</p>`,
      )}
      ${metaChips}
      ${when(
        document.summary,
        () => `<p class="doc-summary">${escapeHtml(document.summary)}</p>`,
      )}
    </div>`;

  const body = renderBlocks(document.blocks, config, format);

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(config.locale)}" dir="${config.direction}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(config.title)}</title>
  ${fontLink}
  <style>${renderThemeStyles(config)}${runningStyles}</style>
</head>
<body>
  ${isCssPaged ? header : ''}
  ${isCssPaged ? footer : ''}
  <main class="report-body">
    ${titleBlock}
    ${body}
  </main>
</body>
</html>`;

  return {
    html,
    // In `css-paged` mode the running elements live inside the document, so no
    // separate templates are sent to the API.
    headerHtml: isCssPaged ? undefined : header,
    footerHtml: isCssPaged ? undefined : footer,
  };
}

/** Convenience for tests and previews: the document HTML only. */
export function renderReportHtml(
  document: ReportDocument,
  config: ResolvedReportConfig,
  format: ReportFormatter,
): string {
  return renderBaseLayout(document, config, format).html;
}

/** Re-exported so consumers can compose fragments without deep imports. */
export { joinHtml };
