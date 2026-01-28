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
  tax: string;
  total: string;
  notes?: string;
  styles: string;
}

interface HeaderTemplateData {
  documentLabel: string;
  documentNumber: string;
  date: string;
  dueDate?: string;
  expirationDate?: string;
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
      }
      .header-wrapper {
        width: 100%;
        padding: 0 5mm;
        font-family: "DejaVu Sans", "Helvetica", "Arial", sans-serif;
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
        font-weight: bold;
        color: #000000;
        letter-spacing: 0.3pt;
      }
      .company-details {
        font-size: 8pt;
        line-height: 1.4;
        color: #222222;
        margin-top: 1mm;
        font-weight: normal;
      }
      .document-title {
        text-align: right;
      }
      .invoice-title {
        font-size: 15pt;
        font-weight: bold;
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
        <div class="company-info">
          ORDERIUM
          <div class="company-details">
            <div>123 Avenue Mohammed V</div>
            <div>Casablanca 20000, Maroc</div>
            <div style="margin-top: 1.5mm;">Tél: +212 5XX-XXXXXX</div>
            <div>Email: contact@orderium.ma</div>
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

export function renderFooterTemplate(): string {
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
      }
      .footer-wrapper {
        width: 100%;
        padding: 0 5mm;
        font-family: "DejaVu Sans", "Helvetica", "Arial", sans-serif;
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
    </style>
    <div class="footer-wrapper">
      <footer class="footer-content">
        <div>RC: XXXXXXX | IF: XXXXXXXX | ICE: XXXXXXXXXXXXXXX</div>
        <div>RIB: XXXXXXXXXXXXXXXXXXXXXXXX</div>
        <div class="footer-text" style="margin-top: 1mm;">Merci pour votre confiance !</div>
      </footer>
    </div>
  `;
}

export function renderDocumentTemplate(data: DocumentTemplateData): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <title>${data.documentTitle} ${data.documentNumber}</title>
        ${data.styles}
        </head>
        <body>
        <div class="invoice-page">
            <!-- Content -->
            <main class="content-wrapper">
                <!-- Customer Section -->
                <section class="customer-section">
                    <div class="customer-grid">
                    <div class="bill-to">
                        <div class="section-title">Client</div>
                        <div class="info-box">
                        <div style="font-weight: bold; margin-bottom: 1mm;">${data.customerName}</div>
                        ${data.customerPhone ? `<div style="font-size: 8pt; color: #666666;">Tél: ${data.customerPhone}</div>` : ''}
                        ${data.customerAddress ? `<div style="font-size: 8pt; color: #666666; margin-top: 1mm;">${data.customerAddress}</div>` : ''}
                        </div>
                    </div>
                    <div class="invoice-details">
                        <div class="section-title">Détails</div>
                        <div class="info-box" style="font-size: 9pt; line-height: 1.6;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #666666;">Date:</span>
                            <span style="font-weight: 600;">${data.date}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #666666;">Document N°:</span>
                            <span style="font-weight: 600;">${data.documentNumber}</span>
                        </div>
                        ${data.documentType === 'quote' && data.signedBy ? `
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #666666;">Signé par:</span>
                            <span style="font-weight: 600;">${data.signedBy}</span>
                        </div>
                        ` : ''}
                        </div>
                    </div>
                    </div>
                </section>

                <!-- Items Table -->
                <section class="table-section">
                    <table class="invoice-table">
                    <thead class="table-header">
                        <tr>
                        <th style="text-align: left; width: 39%;">Description</th>
                        <th style="text-align: center; width: 10%;">Qté</th>
                        <th style="text-align: right; width: 13%;">P.U. HT</th>
                        <th style="text-align: right; width: 10%;">Remise</th>
                        <th style="text-align: right; width: 10%;">TVA</th>
                        <th style="text-align: right; width: 18%;">Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.itemsHtml}
                    </tbody>
                    </table>

                    <!-- Totals -->
                    <div class="totals-section">
                      <div class="totals-row">
                        <span class="totals-label">Sous-total HT</span>
                        <span class="totals-value">${data.subtotal} DH</span>
                      </div>
                      <div class="totals-row">
                        <span class="totals-label">TVA (20%)</span>
                        <span class="totals-value">${data.tax} DH</span>
                      </div>
                      <div class="totals-row totals-grand">
                        <span class="totals-label">Total TTC</span>
                        <span class="totals-value">${data.total} DH</span>
                      </div>
                    </div>

                    <!-- Notes -->
                    ${data.notes ? `
                    <div style="margin-top: 4mm; padding: 3mm; background-color: #F8F9FA; border: 1px solid #DDDDDD; border-radius: 2mm;">
                    <div style="font-weight: bold; margin-bottom: 1mm;">Notes:</div>
                    <div style="font-size: 8pt; color: #555555;">${data.notes}</div>
                    </div>
                    ` : ''}
                </section>
            </main>
        </div>
        </body>
        </html>
    `;
}
