interface DocumentTemplateData {
  documentTitle: string;
  documentLabel: string;
  documentNumber: string;
  date: string;
  dueDate?: string;
  expirationDate?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerIce?: string;
  documentType: string;
  signedBy?: string;
  itemsHtml: string;
  subtotal: string;
  discount?: string;
  discountType?: number;
  tax: string;
  total: string;
  notes?: string;
  styles: string;
  hideVAT?: boolean;
  isPurchaseDocument?: boolean;
  isDemandePrix?: boolean;
  totalQuantity?: string;
}

interface HeaderTemplateData {
  companyName: string;
  companyLines: string[];
  documentLabel: string;
  documentNumber: string;
  date: string;
  dueDate?: string;
  expirationDate?: string;
}

interface FooterTemplateData {
  footerLines: string[];
  hideVAT?: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   A5 HEADER — Playwright displayHeaderFooter template
   ═══════════════════════════════════════════════════════════════ */
export function renderHeaderTemplate(data: HeaderTemplateData): string {
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
      .hdr-company { max-width: 58%; }
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
        letter-spacing: 0.6pt;
        text-transform: uppercase;
        line-height: 1.15;
      }
      .hdr-doc-meta {
        margin-top: 1mm;
        font-size: 6.5pt;
        color: #555555;
        line-height: 1.4;
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
    <div class="hdr-wrap">
      <div class="hdr-inner">
        <div class="hdr-company">
          <div class="hdr-company-name" dir="auto">${data.companyName}</div>
          <div class="hdr-company-lines">
            ${data.companyLines.map((line) => `<div dir="auto">${line}</div>`).join('')}
          </div>
        </div>
        <div class="hdr-doc">
          <div class="hdr-doc-label">${data.documentLabel}</div>
          <div class="hdr-doc-meta">
            <div><span class="meta-label">N°</span> <span class="meta-value">${data.documentNumber}</span></div>
            <div><span class="meta-label">Date</span> <span class="meta-value">${data.date}</span></div>
            ${data.dueDate ? `<div><span class="meta-label">Échéance</span> <span class="meta-value">${data.dueDate}</span></div>` : ''}
            ${data.expirationDate ? `<div><span class="meta-label">Valide jusqu'au</span> <span class="meta-value">${data.expirationDate}</span></div>` : ''}
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
    <div class="ftr-wrap">
      <div class="ftr-inner">
        ${!data.hideVAT ? data.footerLines.map((line) => `<div class="ftr-legal">${line}</div>`).join('') : ''}
        <div class="ftr-bottom">
          <div class="ftr-thanks">Merci pour votre confiance !</div>
          <div class="ftr-page">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   A5 DOCUMENT BODY
   ═══════════════════════════════════════════════════════════════ */
export function renderDocumentTemplate(data: DocumentTemplateData): string {
  // Build discount row if it exists
  const discountRowHtml =
    data.discount && data.discount !== '0.00'
      ? `<div class="totals-row">
           <span class="totals-label">Remise${data.discountType === 1 ? ' (%)' : ''}</span>
           <span class="totals-value">-${data.discount}${data.discountType === 1 ? '%' : ' DH'}</span>
         </div>`
      : '';

  return `
        <!DOCTYPE html>
        <html lang="ar">
        <head>
        <meta charset="UTF-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&display=block" rel="stylesheet">
        <title>${data.documentTitle} ${data.documentNumber}</title>
        ${data.styles}
        </head>
        <body>
        <div class="invoice-page">
            <main class="content-wrapper">
                <!-- Customer / Supplier Section -->
                <section class="customer-section">
                    <div class="customer-grid">
                        <div class="bill-to">
                            <div class="section-label">${data.isPurchaseDocument ? 'Fournisseur' : 'Client'}</div>
                            <div class="info-box">
                                <div dir="auto" class="customer-name">${data.customerName}</div>
                                ${data.customerPhone ? `<div dir="auto" class="customer-detail"><strong>Tél:</strong> ${data.customerPhone}</div>` : ''}
                                ${data.customerAddress ? `<div dir="auto" class="customer-detail"><strong>Adresse:</strong> ${data.customerAddress}</div>` : ''}
                                ${data.customerIce ? `<div dir="auto" class="customer-detail"><strong>ICE:</strong> ${data.customerIce}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Items Table -->
                <section class="table-section">
                    <table class="invoice-table">
                        <thead class="table-header">
                            <tr>
                                ${
                                  data.isDemandePrix
                                    ? `
                                <th style="text-align: left; width: 70%;">Description</th>
                                <th style="text-align: center; width: 30%;">Qté</th>
                                `
                                    : `
                                <th style="text-align: left; width: ${data.hideVAT ? '48%' : '40%'};">Description</th>
                                <th style="text-align: center; width: ${data.hideVAT ? '13%' : '10%'};">Qté</th>
                                <th style="text-align: right; width: ${data.hideVAT ? '13%' : '12%'};">P.U.</th>
                                <th style="text-align: right; width: ${data.hideVAT ? '13%' : '12%'};">Remise</th>
                                ${!data.hideVAT ? '<th style="text-align: right; width: 12%;">TVA</th>' : ''}
                                <th style="text-align: right; width: ${data.hideVAT ? '13%' : '14%'};">Total</th>
                                `
                                }
                            </tr>
                        </thead>
                        <tbody>
                            ${data.itemsHtml}
                        </tbody>
                    </table>

                    <!-- Totals -->
                    <div class="totals-section">
                      ${
                        data.isDemandePrix
                          ? `
                      <div class="totals-row totals-grand">
                        <span class="totals-label">Total Quantité Demandée</span>
                        <span class="totals-value">${data.totalQuantity || '0'}</span>
                      </div>
                      `
                          : !data.hideVAT
                            ? `
                      <div class="totals-row">
                        <span class="totals-label">Sous-total HT</span>
                        <span class="totals-value">${data.subtotal} DH</span>
                      </div>
                      ${discountRowHtml}
                      <div class="totals-row">
                        <span class="totals-label">TVA (20%)</span>
                        <span class="totals-value">${data.tax} DH</span>
                      </div>
                      <div class="totals-row totals-grand">
                        <span class="totals-label">Total TTC</span>
                        <span class="totals-value">${data.total} DH</span>
                      </div>
                      `
                            : `
                      ${discountRowHtml}
                      <div class="totals-row totals-grand">
                        <span class="totals-label">Total</span>
                        <span class="totals-value">${data.total} DH</span>
                      </div>
                      `
                      }
                    </div>

                    <!-- Notes -->
                    ${
                      data.notes
                        ? `
                    <div class="notes-block">
                      <div class="notes-title">Notes</div>
                      <div dir="auto" class="notes-body">${data.notes}</div>
                    </div>
                    `
                        : ''
                    }
                </section>
            </main>
        </div>
        </body>
        </html>
    `;
}
