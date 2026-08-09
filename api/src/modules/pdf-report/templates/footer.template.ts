import { PageNumberingStrategy, ResolvedReportConfig } from '../types';
import { escapeHtml, when } from '../core/html.util';
import { createReportFormatter } from '../core/report-formatter';

/**
 * The running page footer: confidentiality note, generation date, "Page X of Y".
 *
 * Page numbering differs by strategy:
 *  - `native` — emits Chromium's `.pageNumber` / `.totalPages` placeholder
 *    spans, which the rendering service substitutes per page.
 *  - `css-paged` — emits `counter(page)` / `counter(pages)` via generated
 *    content, which paged-media engines resolve.
 */
export function renderFooter(
  config: ResolvedReportConfig,
  strategy: PageNumberingStrategy,
): string {
  const { theme, footer, labels } = config;
  const isNative = strategy === 'native';

  const formatter = createReportFormatter({
    locale: config.locale,
    currency: config.currency,
    timeZone: config.timeZone,
  });

  const noteCell = when(
    footer.note,
    () =>
      `<div style="flex:1 1 auto;min-width:0;text-align:start;">${escapeHtml(footer.note)}</div>`,
  );

  const generatedCell = when(
    footer.showGeneratedAt,
    () =>
      `<div style="flex:0 0 auto;text-align:center;">${escapeHtml(
        `${labels.generatedAt} ${formatter.dateTime(config.generatedAt)}`,
      )}</div>`,
  );

  const pageCell = footer.showPageNumbers
    ? isNative
      ? `<div style="flex:0 0 auto;text-align:end;">
           ${escapeHtml(labels.page)} <span class="pageNumber"></span>
           ${escapeHtml(labels.pageOf)} <span class="totalPages"></span>
         </div>`
      : `<div class="page-counter" style="flex:0 0 auto;text-align:end;"></div>`
    : '';

  // A single flex row keeps the three slots aligned even when one is absent.
  const inner = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;">
      ${noteCell || '<div style="flex:1 1 auto;"></div>'}
      ${generatedCell}
      ${pageCell}
    </div>`;

  if (!isNative) {
    return `<footer class="running-footer">${inner}</footer>`;
  }

  return `
    <div style="
      width:100%;
      box-sizing:border-box;
      padding:0 12mm;
      font-family:${theme.fontFamily};
      font-size:7.5px;
      color:${theme.textMuted};
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
    ">
      <div style="margin-bottom:4px;border-top:1px solid ${theme.border};"></div>
      ${inner}
    </div>`;
}

/**
 * Fixed-position CSS plus the page counters used only by the `css-paged`
 * strategy.
 */
export function renderRunningFooterStyles(
  config: ResolvedReportConfig,
): string {
  const { labels } = config;
  const bottom = config.page.margins.bottom;
  return `
.running-footer {
  position: fixed;
  bottom: calc(-1 * ${bottom});
  inset-inline: 0;
  height: ${bottom};
  display: flex;
  align-items: flex-start;
  padding-top: var(--sp-2);
  border-top: 1px solid var(--c-border);
  background: var(--c-bg);
  font-size: var(--fs-xs);
  color: var(--c-muted);
}

.page-counter::after {
  content: '${escapeCssString(labels.page)} ' counter(page) ' ${escapeCssString(labels.pageOf)} ' counter(pages);
}
`;
}

/** Escapes a string for use inside a CSS `content: '…'` literal. */
function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
