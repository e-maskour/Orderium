interface ReceiptTemplateData {
  documentNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  itemsHtml: string;
  subtotal: string;
  discount?: string;
  discountType?: number;
  tax: string;
  total: string;
  hideVAT?: boolean;
  companyName: string;
  companyLines: string[];
}

export function renderReceiptTemplate(data: ReceiptTemplateData): string {
  // Build discount row if it exists
  const discountRowHtml =
    data.discount && data.discount !== '0.00'
      ? `<div class="totals-line">
         <span>Remise${data.discountType === 1 ? ' (%)' : ''}</span>
         <span>-${data.discount}${data.discountType === 1 ? '%' : ' DH'}</span>
       </div>`
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&family=Noto+Sans:wght@400;600;700&display=block" rel="stylesheet">
  <title>Reçu ${data.documentNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: "Noto Sans", "Noto Sans Arabic", monospace;
      background: #fff;
      width: 80mm;
      margin: 0;
      padding: 0;
      font-size: 7.5pt;
      color: #000;
      line-height: 1.25;
      -webkit-font-smoothing: antialiased;
    }

    .receipt {
      padding: 3mm;
    }

    /* ── Company header ──────────────────── */
    .rcp-header {
      text-align: center;
      padding-bottom: 2mm;
    }
    .rcp-company-name {
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 0.5pt;
      line-height: 1.2;
    }
    .rcp-company-detail {
      font-size: 6.5pt;
      color: #444;
      line-height: 1.4;
      margin-top: 0.5mm;
    }

    /* ── Separators ──────────────────────── */
    .sep-dash {
      border: none;
      border-top: 1px dashed #000;
      margin: 2mm 0;
    }
    .sep-solid {
      border: none;
      border-top: 1.5px solid #000;
      margin: 2mm 0;
    }

    /* ── Document info ───────────────────── */
    .rcp-info {
      padding: 0.5mm 0 1mm 0;
    }
    .rcp-doc-label {
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.3pt;
    }
    .rcp-meta {
      font-size: 7pt;
      color: #333;
      margin-top: 0.5mm;
      line-height: 1.4;
    }

    /* ── Items list ──────────────────────── */
    .rcp-items {
      padding: 0;
    }
    .rcp-item {
      padding: 1.5px 0;
    }
    .rcp-item-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 2mm;
    }
    .rcp-item-desc {
      font-size: 7.5pt;
      font-weight: 600;
      line-height: 1.25;
      flex: 1;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      text-overflow: ellipsis;
      text-align: left;
    }
    .rcp-item-total {
      font-size: 7.5pt;
      font-weight: 600;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      text-align: right;
      min-width: 14mm;
    }
    .rcp-item-detail {
      font-size: 6.5pt;
      color: #555;
      line-height: 1.3;
      margin-top: 0.3mm;
    }
    .rcp-item-detail .rcp-discount {
      color: #777;
    }

    /* ── Totals ──────────────────────────── */
    .rcp-totals {
      padding-top: 0.5mm;
    }
    .totals-line {
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      padding: 0.5mm 0;
      font-variant-numeric: tabular-nums;
    }
    .totals-line span:first-child {
      color: #333;
    }
    .totals-grand {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      font-weight: 700;
      padding: 1.5mm 0 0.5mm 0;
      border-top: 1.5px solid #000;
      margin-top: 1mm;
    }

    /* ── Footer ──────────────────────────── */
    .rcp-footer {
      text-align: center;
      padding-top: 1mm;
    }
    .rcp-thanks {
      font-size: 7pt;
      font-weight: 600;
      letter-spacing: 0.2pt;
    }
    .rcp-legal {
      font-size: 5.5pt;
      color: #666;
      margin-top: 1mm;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Company Header -->
    <div class="rcp-header">
      <div class="rcp-company-name" dir="auto">${data.companyName}</div>
      ${data.companyLines.map((line) => `<div class="rcp-company-detail" dir="auto">${line}</div>`).join('')}
    </div>

    <hr class="sep-dash" />

    <!-- Document Info -->
    <div class="rcp-info">
      <div class="rcp-doc-label">REÇU N° ${data.documentNumber}</div>
      <div class="rcp-meta">
        ${data.date}<br/>
        <span dir="auto">${data.customerName}</span>${data.customerPhone ? ` · ${data.customerPhone}` : ''}
      </div>
    </div>

    <hr class="sep-dash" />

    <!-- Items -->
    <div class="rcp-items">
      ${data.itemsHtml}
    </div>

    <hr class="sep-dash" />

    <!-- Totals -->
    <div class="rcp-totals">
      ${!data.hideVAT
      ? `
      <div class="totals-line">
        <span>Sous-total</span>
        <span>${data.subtotal} DH</span>
      </div>
      ${discountRowHtml}
      <div class="totals-line">
        <span>TVA (20%)</span>
        <span>${data.tax} DH</span>
      </div>
      `
      : `
      ${discountRowHtml}
      `
    }
      <div class="totals-grand">
        <span>TOTAL</span>
        <span>${data.total} DH</span>
      </div>
    </div>

    <hr class="sep-dash" />

    <!-- Footer -->
    <div class="rcp-footer">
      <div class="rcp-thanks">Merci pour votre confiance !</div>
    </div>
  </div>
</body>
</html>
  `;
}
