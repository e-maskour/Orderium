/* eslint-disable prettier/prettier */

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

export function renderHeaderTemplate(data: HeaderTemplateData): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        font-family: "Noto Sans Arabic", "Noto Sans", "Helvetica Neue", "Arial", sans-serif;
      }
      .header-wrapper {
        width: 100%;
        padding: 5mm;
        font-family: "Noto Sans Arabic", "Noto Sans", "Helvetica Neue", "Arial", sans-serif;
        font-size: 9pt;
      }
      header.header-content {
        display: flex;
        justify-content: space-between;
        padding-bottom: 1mm;
        border-bottom: 1pt solid #DDDDDD;
      }
      .company-info {
        font-size: 14pt;
        font-weight: 700;
        color: #000000;
        letter-spacing: 0.3pt;
        unicode-bidi: plaintext;
        text-align: start;
      }
      .company-details {
        font-size: 8pt;
        line-height: 1.5;
        color: #222222;
        margin-top: 1mm;
        font-weight: normal;
        unicode-bidi: plaintext;
        text-align: start;
      }
      .document-title {
        text-align: right;
      }
      .invoice-title {
        font-size: 15pt;
        font-weight: 700;
        color: #000000;
        margin-bottom: 2mm;
      }
      .invoice-meta {
        font-size: 8pt;
        color: #666666;
      }
    </style>
    <div class="header-wrapper">
      <header class="header-content">
        <div class="company-info" dir="auto">
          ${data.companyName}
          <div class="company-details">
            ${data.companyLines.map((line) => `<div dir="auto">${line}</div>`).join('')}
          </div>
        </div>
        <div class="document-title">
          <div class="invoice-title">${data.documentLabel}</div>
          <div class="invoice-meta">
            <div style="margin-bottom: 1mm;">N° ${data.documentNumber}</div>
            <div>Date: ${data.date}</div>
            ${data.dueDate ? `<div>Échéance: ${data.dueDate}</div>` : ''}
            ${data.expirationDate ? `<div>Valide jusqu'au: ${data.expirationDate}</div>` : ''}
          </div>
        </div>
      </header>
    </div>
  `;
}

export function renderFooterTemplate(data: FooterTemplateData): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        font-family: "Noto Sans Arabic", "Noto Sans", "Helvetica Neue", "Arial", sans-serif;
      }
      .footer-wrapper {
        width: 100%;
        padding: 0 5mm;
        font-family: "Noto Sans Arabic", "Noto Sans", "Helvetica Neue", "Arial", sans-serif;
        font-size: 6.5pt;
        color: #777777;
      }
      footer.footer-content {
        border-top: 0.5pt solid #DDDDDD;
        padding-top: 1mm;
      }
      .footer-text {
        font-weight: 600;
        color: #555555;
      }
      .footer-legal {
        font-weight: 700;
        color: #333333;
      }
      .footer-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1mm;
      }
      .footer-page-number {
        text-align: right;
        font-weight: 600;
        color: #555555;
      }
    </style>
    <div class="footer-wrapper">
      <footer class="footer-content">
        ${!data.hideVAT ? data.footerLines.map((line) => `<div class="footer-legal">${line}</div>`).join('') : ''}
        <div class="footer-bottom">
          <div class="footer-text">Merci pour votre confiance !</div>
          <div class="footer-page-number">Page <span class="pageNumber"></span>/<span class="totalPages"></span></div>
        </div>
      </footer>
    </div>
  `;
}

export function renderDocumentTemplate(data: DocumentTemplateData): string {
  // Build discount row if it exists
  const discountRowHtml = data.discount && data.discount !== '0.00'
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
            <!-- Content -->
            <main class="content-wrapper">
                <!-- Customer/Supplier Section -->
                <section class="customer-section">
                    <div class="customer-grid">
                        <div class="bill-to">
                            <div class="section-title">${data.isPurchaseDocument ? 'Fournisseur' : 'Client'}</div>
                            <div class="info-box">
                            <div dir="auto" style="font-weight: bold; margin-bottom: 1mm;">${data.customerName}</div>
                            ${data.customerPhone ? `<div dir="auto" style="font-size: 8pt; color: #666666;">Tél: ${data.customerPhone}</div>` : ''}
                            ${data.customerAddress ? `<div dir="auto" style="font-size: 8pt; color: #666666; margin-top: 1mm;">${data.customerAddress}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Items Table -->
                <section class="table-section">
                    <table class="invoice-table">
                        <thead class="table-header">
                            <tr>
                                ${data.isDemandePrix ? `
                                <th style="text-align: left; width: 70%;">Description</th>
                                <th style="text-align: center; width: 30%;">Qté</th>
                                ` : `
                                <th style="text-align: left; width: ${data.hideVAT ? '48%' : '40%'};">Description</th>
                                <th style="text-align: center; width: ${data.hideVAT ? '13%' : '10%'};">Qté</th>
                                <th style="text-align: center; width: ${data.hideVAT ? '13%' : '12%'};">P.U.</th>
                                <th style="text-align: center; width: ${data.hideVAT ? '13%' : '12%'};">Remise</th>
                                ${!data.hideVAT ? '<th style="text-align: center; width: 12%;">TVA</th>' : ''}
                                <th style="text-align: center; width: ${data.hideVAT ? '13%' : '14%'};">Total</th>
                                `}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.itemsHtml}
                        </tbody>
                    </table>

                    <!-- Totals -->
                    <div class="totals-section">
                      ${data.isDemandePrix ? `
                      <div class="totals-row totals-grand">
                        <span class="totals-label">Total Quantité Demandée</span>
                        <span class="totals-value">${data.totalQuantity || '0'}</span>
                      </div>
                      ` : !data.hideVAT ? `
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
                      ` : `
                      ${discountRowHtml}
                      <div class="totals-row totals-grand">
                        <span class="totals-label">Total</span>
                        <span class="totals-value">${data.total} DH</span>
                      </div>
                      `}
                    </div>

                    <!-- Notes -->
                    ${data.notes ? `
                    <div style="margin-top: 4mm; padding: 3mm; background-color: #F8F9FA; border: 1px solid #DDDDDD; border-radius: 2mm;">
                    <div style="font-weight: bold; margin-bottom: 1mm;">Notes:</div>
                    <div dir="auto" style="font-size: 8pt; color: #555555; unicode-bidi: plaintext; text-align: start;">${data.notes}</div>
                    </div>
                    ` : ''}
                </section>
            </main>
        </div>
        </body>
        </html>
    `;
}
