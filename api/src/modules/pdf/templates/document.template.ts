interface HeaderTemplateData {
  companyName: string;
  companyLines: string[];
  /** Inline `data:` URI — header templates can't fetch remote resources. */
  logoSrc?: string;
  documentLabel: string;
  documentNumber: string;
  date: string;
  dueDate?: string;
  expirationDate?: string;
  lang?: 'fr' | 'ar';
}

interface FooterTemplateData {
  footerLines: string[];
  hideVAT?: boolean;
  lang?: 'fr' | 'ar';
}

/* ═══════════════════════════════════════════════════════════════
   A5 HEADER — Playwright displayHeaderFooter template
   ═══════════════════════════════════════════════════════════════ */
export function renderHeaderTemplate(data: HeaderTemplateData): string {
  const isRTL = data.lang === 'ar';
  const L = {
    num: isRTL ? 'رقم' : 'N°',
    date: isRTL ? 'التاريخ' : 'Date',
    dueDate: isRTL ? 'الاستحقاق' : 'Échéance',
    validUntil: isRTL ? 'صالح حتى' : "Valide jusqu'au",
  };
  // Only inline images are usable here; anything else would make Chromium
  // try (and fail) to fetch it while printing the header.
  const logoHtml =
    data.logoSrc && data.logoSrc.startsWith('data:image/')
      ? `<img class="hdr-logo" src="${data.logoSrc.replace(/"/g, '&quot;')}" alt="">`
      : '';
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 100%; height: 100%; margin: 0; padding: 0;
        font-family: "Noto Sans", "Noto Sans Arabic", "Helvetica Neue", Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .hdr-wrap {
        width: 100%;
        padding: 3mm 5mm 1mm 5mm;
        font-size: 7pt;
        color: #1A1A1A;
      }
      .hdr-inner {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 1.5mm;
        border-bottom: 1.5pt solid #1B5E7B;
      }
      /* Company side */
      .hdr-brand { display: flex; align-items: flex-start; gap: 2.5mm; max-width: 62%; }
      .hdr-logo {
        flex: none;
        max-width: 22mm;
        max-height: 14mm;
        object-fit: contain;
      }
      .hdr-company { min-width: 0; }
      .hdr-company-name {
        font-size: 11pt;
        font-weight: 700;
        color: #1B5E7B;
        letter-spacing: 0.2pt;
        unicode-bidi: plaintext;
        text-align: start;
        line-height: 1.15;
      }
      .hdr-company-lines {
        margin-top: 0.5mm;
        font-size: 6pt;
        line-height: 1.35;
        color: #555555;
        unicode-bidi: plaintext;
        text-align: start;
      }
      /* Document side */
      .hdr-doc { text-align: right; }
      .hdr-doc-label {
        font-size: 11pt;
        font-weight: 700;
        color: #1B5E7B;
        letter-spacing: ${isRTL ? '0pt' : '0.6pt'};
        text-transform: ${isRTL ? 'none' : 'uppercase'};
        line-height: 1.15;
      }
      .hdr-doc-meta {
        margin-top: 1mm;
        font-size: 6.5pt;
        color: #555555;
        line-height: 1.4;
        direction: ${isRTL ? 'rtl' : 'ltr'};
        text-align: ${isRTL ? 'right' : 'right'};
      }
      .hdr-doc-meta .meta-label {
        color: #888888;
        font-size: 5.5pt;
        text-transform: uppercase;
        letter-spacing: 0.3pt;
      }
      .hdr-doc-meta .meta-value {
        font-weight: 600;
        color: #1A1A1A;
      }
    </style>
    <div class="hdr-wrap" dir="ltr">
      <div class="hdr-inner">
        <div class="hdr-brand">
          ${logoHtml}
          <div class="hdr-company">
            <div class="hdr-company-name" dir="auto">${data.companyName}</div>
            <div class="hdr-company-lines">
              ${data.companyLines.map((line) => `<div dir="auto">${line}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="hdr-doc">
          <div class="hdr-doc-label">${data.documentLabel}</div>
          <div class="hdr-doc-meta">
            <div><span class="meta-label">${L.num}</span> <span class="meta-value">${data.documentNumber}</span></div>
            <div><span class="meta-label">${L.date}</span> <span class="meta-value">${data.date}</span></div>
            ${data.dueDate ? `<div><span class="meta-label">${L.dueDate}</span> <span class="meta-value">${data.dueDate}</span></div>` : ''}
            ${data.expirationDate ? `<div><span class="meta-label">${L.validUntil}</span> <span class="meta-value">${data.expirationDate}</span></div>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   A5 FOOTER — Playwright displayHeaderFooter template
   ═══════════════════════════════════════════════════════════════ */
export function renderFooterTemplate(data: FooterTemplateData): string {
  const isRTL = data.lang === 'ar';
  const thanks = isRTL ? 'شكراً لثقتكم!' : 'Merci pour votre confiance !';
  const pageLbl = isRTL ? 'صفحة' : 'Page';
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 100%; height: 100%; margin: 0; padding: 0;
        font-family: "Noto Sans", "Noto Sans Arabic", "Helvetica Neue", Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .ftr-wrap {
        width: 100%;
        padding: 0 5mm 1mm 5mm;
        font-size: 6.5pt;
        color: #888888;
      }
      .ftr-inner {
        border-top: 0.5pt solid #E0E0E0;
        padding-top: 1.5mm;
      }
      .ftr-legal {
        font-weight: 600;
        color: #555555;
        font-size: 6pt;
        letter-spacing: 0.2pt;
      }
      .ftr-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1mm;
      }
      .ftr-thanks {
        font-style: italic;
        color: #888888;
      }
      .ftr-page {
        font-weight: 600;
        color: #555555;
      }
    </style>
    <div class="ftr-wrap" dir="${isRTL ? 'rtl' : 'ltr'}">
      <div class="ftr-inner">
        ${!data.hideVAT ? data.footerLines.map((line) => `<div class="ftr-legal">${line}</div>`).join('') : ''}
        <div class="ftr-bottom">
          <div class="ftr-thanks">${thanks}</div>
          <div class="ftr-page">${pageLbl} <span class="pageNumber"></span> / <span class="totalPages"></span></div>
        </div>
      </div>
    </div>
  `;
}
