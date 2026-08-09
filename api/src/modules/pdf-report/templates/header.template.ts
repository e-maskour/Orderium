import { ResolvedReportConfig, PageNumberingStrategy } from '../types';
import { escapeHtml, joinHtml, when } from '../core/html.util';

/** Builds the `src` for the logo from either a URL or inline base64. */
export function resolveLogoSrc(config: ResolvedReportConfig): string | null {
  const logo = config.branding.logo;
  if (!logo) return null;
  if (logo.url) return logo.url;
  if (logo.base64) {
    return `data:${logo.mimeType || 'image/png'};base64,${logo.base64}`;
  }
  return null;
}

/** Address lines, collapsed into a single comma-separated string. */
export function buildAddressLine(config: ResolvedReportConfig): string {
  const address = config.branding.address;
  if (!address) return '';

  const cityZip = [address.zipCode, address.city].filter(Boolean).join(' ');
  return [address.line1, address.line2, cityZip, address.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

/** `Tél: … · Email: … · Web: …` */
export function buildContactLine(config: ResolvedReportConfig): string {
  const { contact } = config.branding;
  const { labels } = config;
  if (!contact) return '';

  return [
    contact.phone && `${labels.phone}: ${contact.phone}`,
    contact.email && `${labels.email}: ${contact.email}`,
    contact.website && `${labels.website}: ${contact.website}`,
  ]
    .filter(Boolean)
    .join('  ·  ');
}

/** `ICE: … · IF: … · TVA: … · RC: …` — the fiscal identity block. */
export function buildIdentifierLines(config: ResolvedReportConfig): string[] {
  const ids = config.branding.identifiers;
  const { labels } = config;
  if (!ids) return [];

  return [
    ids.commonCompanyId && `${labels.commonCompanyId}: ${ids.commonCompanyId}`,
    ids.taxId && `${labels.taxId}: ${ids.taxId}`,
    ids.vatNumber && `${labels.vatNumber}: ${ids.vatNumber}`,
    ids.registrationNumber &&
      `${labels.registrationNumber}: ${ids.registrationNumber}`,
  ].filter((line): line is string => Boolean(line));
}

/**
 * The running page header: logo, company name, company details, fiscal IDs.
 *
 * Rendered twice-over by design:
 *  - `native` — as a standalone fragment handed to the PDF API. Chromium-based
 *    renderers do **not** inherit the document's stylesheet into header/footer
 *    templates, so every rule here is inlined.
 *  - `css-paged` — as a `position: fixed` element inside the document, which
 *    paged-media engines repeat on every page using the document stylesheet.
 */
export function renderHeader(
  config: ResolvedReportConfig,
  strategy: PageNumberingStrategy,
): string {
  const { theme, branding } = config;
  const logoSrc = resolveLogoSrc(config);
  const addressLine = buildAddressLine(config);
  const contactLine = buildContactLine(config);
  const identifierLines = buildIdentifierLines(config);
  const isNative = strategy === 'native';

  // Chromium shrinks header templates to ~10px and ignores inherited sizing,
  // so the native variant is expressed in absolute px rather than the type scale.
  const px = (nativeSize: string, docSize: string) =>
    isNative ? nativeSize : docSize;

  const logo = when(
    logoSrc,
    () => `
      <img
        src="${escapeHtml(logoSrc)}"
        alt="${escapeHtml(branding.logo?.alt || branding.companyName)}"
        style="width:${branding.logo?.widthPx ?? 96}px;max-height:44px;object-fit:contain;object-position:left center;"
      />`,
  );

  const companyBlock = joinHtml([
    `<div style="font-size:${px('11px', 'var(--fs-md)')};font-weight:700;color:${theme.textStrong};letter-spacing:-0.01em;">
       ${escapeHtml(branding.companyName)}
     </div>`,
    when(
      branding.tagline,
      () =>
        `<div style="font-size:${px('8px', 'var(--fs-xs)')};color:${theme.textMuted};">${escapeHtml(branding.tagline)}</div>`,
    ),
    when(
      addressLine,
      () =>
        `<div style="font-size:${px('8px', 'var(--fs-xs)')};color:${theme.textMuted};margin-top:2px;">${escapeHtml(addressLine)}</div>`,
    ),
    when(
      contactLine,
      () =>
        `<div style="font-size:${px('8px', 'var(--fs-xs)')};color:${theme.textMuted};">${escapeHtml(contactLine)}</div>`,
    ),
  ]);

  const identifiersBlock = when(
    identifierLines.length > 0,
    () => `
      <div style="text-align:end;font-size:${px('8px', 'var(--fs-xs)')};color:${theme.textMuted};line-height:1.5;">
        ${identifierLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
      </div>`,
  );

  const inner = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;width:100%;">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;">
        ${logo}
        <div style="min-width:0;">${companyBlock}</div>
      </div>
      ${identifiersBlock}
    </div>`;

  if (!isNative) {
    return `<header class="running-header">${inner}</header>`;
  }

  // Chromium prints header templates inside its own top margin box; the outer
  // padding keeps the content off the paper edge.
  return `
    <div style="
      width:100%;
      box-sizing:border-box;
      padding:0 12mm;
      font-family:${theme.fontFamily};
      color:${theme.textBase};
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
    ">
      ${inner}
      <div style="margin-top:6px;border-bottom:1px solid ${theme.border};"></div>
    </div>`;
}

/**
 * Fixed-position CSS used only by the `css-paged` strategy.
 *
 * In paged media a fixed element is positioned against the *page area* (inside
 * the margins), so the header is pulled up by the top margin to sit in the
 * margin box where a running header belongs.
 */
export function renderRunningHeaderStyles(
  config: ResolvedReportConfig,
): string {
  const top = config.page.margins.top;
  return `
.running-header {
  position: fixed;
  top: calc(-1 * ${top});
  inset-inline: 0;
  height: ${top};
  display: flex;
  align-items: flex-end;
  padding-bottom: var(--sp-2);
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg);
}
`;
}
