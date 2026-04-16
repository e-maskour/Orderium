interface ReceiptTemplateData {
  documentNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  itemsHtml: string;
  totalQty: number;
  totalProducts: number;
  subtotal: string;
  discount?: string;
  discountType?: number;
  tax: string;
  total: string;
  hideVAT?: boolean;
  companyName: string;
  companyLines: string[];
  lang?: 'fr' | 'ar';
}

export function renderReceiptTemplate(data: ReceiptTemplateData): string {
  const isRTL = data.lang === 'ar';
  const L = {
    receipt: isRTL ? 'إيصال' : 'Reçu',
    client: isRTL ? 'العميل' : 'Client',
    designation: isRTL ? 'الوصف' : 'Désignation',
    total: isRTL ? 'المجموع' : 'Total',
    articles: isRTL ? 'صنف' : 'article',
    articlesPl: isRTL ? 'أصناف' : 'articles',
    totalQty: isRTL ? 'إجمالي الكمية' : 'Qté totale',
    subtotal: isRTL ? 'المجموع الجزئي' : 'Sous-total',
    discount: isRTL ? 'الخصم' : 'Remise',
    discountPct: isRTL ? 'الخصم (%)' : 'Remise (%)',
    tva20: 'TVA (20%)',
    thanks: isRTL ? 'شكراً لثقتكم!' : 'Merci pour votre confiance !',
    seeYouSoon: isRTL ? 'إلى اللقاء' : 'À bientôt',
  };

  const discountRowHtml =
    data.discount && data.discount !== '0.00'
      ? `<tr class="t-sub">
           <td class="t-label">${data.discountType === 1 ? L.discountPct : L.discount}</td>
           <td class="t-amount">-${data.discount}${data.discountType === 1 ? '%' : ` ${isRTL ? 'د.م' : 'DH'}`}</td>
         </tr>`
      : '';

  return `
<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;700&family=Noto+Sans:wght@400;500;600;700&display=block" rel="stylesheet">
  <title>${L.receipt} ${data.documentNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; break-inside: avoid; page-break-inside: avoid; }

    body {
      font-family: "Noto Sans", "Noto Sans Arabic", sans-serif;
      background: #fff;
      width: 80mm;
      margin: 0 auto;
      padding: 0;
      font-size: 7.5pt;
      color: #1a1a1a;
      line-height: 1.3;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Wrapper ─────────────────────────── */
    .rcp { padding: 4mm 4mm 5mm; }

    /* ── Company header ──────────────────── */
    .rcp-brand {
      text-align: center;
      padding-bottom: 3mm;
    }
    .rcp-brand-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 10mm;
      height: 10mm;
      border-radius: 2.5mm;
      background: #1a1a1a;
      margin-bottom: 1.5mm;
    }
    .rcp-brand-initial {
      font-size: 13pt;
      font-weight: 700;
      color: #fff;
      text-transform: uppercase;
      line-height: 1;
      letter-spacing: -0.5pt;
    }
    .rcp-company-name {
      font-size: 10.5pt;
      font-weight: 700;
      letter-spacing: -0.2pt;
      line-height: 1.2;
      color: #0a0a0a;
    }
    .rcp-company-detail {
      font-size: 6.5pt;
      color: #555;
      line-height: 1.5;
      margin-top: 0.3mm;
    }
    .rcp-company-detail b {
      color: #222;
      font-weight: 600;
    }

    /* ── Separators ──────────────────────── */
    .sep { border: none; margin: 2.5mm 0; }
    .sep-tight { border: none; margin: 1mm 0; }
    .sep-solid { border-top: 1.5px solid #1a1a1a; }
    .sep-dash  { border-top: 1px dashed #aaa; }
    .sep-thin  { border-top: 0.5px solid #ddd; }

    /* ── Receipt title band ──────────────── */
    .rcp-title-band {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5mm 0;
    }
    .rcp-badge {
      display: inline-block;
      background: #1a1a1a;
      color: #fff;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.4pt;
      text-transform: uppercase;
      padding: 0.7mm 2.5mm;
      border-radius: 1mm;
    }
    .rcp-doc-num {
      font-size: 6.5pt;
      font-weight: 600;
      color: #333;
      letter-spacing: 0.2pt;
    }
    .rcp-doc-date {
      font-size: 6.5pt;
      color: #555;
    }

    /* ── Customer row ────────────────────── */
    .rcp-customer {
      padding: 0;
    }
    .rcp-customer-label {
      font-size: 6pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      color: #888;
      margin-bottom: 0.5mm;
    }
    .rcp-customer-value {
      font-size: 7.5pt;
      font-weight: 600;
      color: #0a0a0a;
    }
    .rcp-customer-meta {
      font-size: 6.5pt;
      color: #555;
      margin-top: 0.3mm;
    }

    /* ── Items table ─────────────────────── */
    .rcp-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
    }
    .rcp-table thead tr {
      border-bottom: 1px solid #1a1a1a;
    }
    .rcp-table th {
      font-size: 6pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4pt;
      color: #555;
      padding: 1mm 0 1.2mm;
    }
    .rcp-table th.th-desc  { text-align: left; }
    .rcp-table th.th-total { text-align: right; width: 18mm; }
${
  isRTL
    ? `
    /* ── Arabic RTL overrides ─────────── */
    .rcp-customer-label, .rcp-customer-value, .rcp-customer-meta { text-align: right; }
    .rcp-table th.th-desc  { text-align: right; }
    .rcp-table th.th-total { text-align: left; }
    .t-label { text-align: right; }
    .t-amount { text-align: left; }
    .t-grand .t-label { text-align: right; }
    .rcp-summary { direction: rtl; }
`
    : ''
}

    .rcp-table tbody tr.t-item td {
      padding: 1.8mm 0 0;
      vertical-align: top;
    }
    .rcp-table tbody tr.t-item + tr.t-item td {
      border-top: 0.5px solid #eee;
    }
    .t-desc {
      font-size: 7.5pt;
      font-weight: 600;
      color: #0a0a0a;
      line-height: 1.3;
      padding-bottom: 0.5mm;
    }
    .t-desc-sub {
      font-size: 6pt;
      color: #777;
      font-weight: 700;
      display: block;
      margin-top: 0.3mm;
      padding-bottom: 1.5mm;
    }
    .t-qty-removed {
      text-align: center;
      font-size: 7.5pt;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: #0a0a0a;
    }
    .t-price {
      text-align: right;
      font-size: 7pt;
      color: #444;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .t-total {
      text-align: right;
      font-size: 7.5pt;
      font-weight: 700;
      color: #0a0a0a;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    /* ── Summary bar ─────────────────────── */
    .rcp-summary {
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #555;
      padding: 1.5mm 0 0;
    }
    .rcp-summary b {
      color: #0a0a0a;
      font-weight: 700;
    }

    /* ── Totals table ────────────────────── */
    .rcp-totals-table {
      width: 100%;
      border-collapse: collapse;
    }
    .t-sub td {
      font-size: 7.5pt;
      padding: 0.6mm 0;
      font-variant-numeric: tabular-nums;
    }
    .t-label {
      text-align: left;
      color: #444;
      padding-right: 2mm;
    }
    .t-amount {
      text-align: right;
      color: #0a0a0a;
      font-weight: 500;
      white-space: nowrap;
    }
    .t-grand td {
      font-size: 10.5pt;
      font-weight: 700;
      padding-top: 2mm;
      padding-bottom: 0.5mm;
      border-top: 1.5px solid #1a1a1a;
      font-variant-numeric: tabular-nums;
      color: #0a0a0a;
    }
    .t-grand .t-label {
      color: #0a0a0a;
    }

    /* ── Footer ──────────────────────────── */
    .rcp-footer {
      text-align: center;
      padding-top: 2mm;
    }
    .rcp-footer-thanks {
      font-size: 7.5pt;
      font-weight: 700;
      color: #0a0a0a;
      letter-spacing: 0.1pt;
    }
    .rcp-footer-sub {
      font-size: 6pt;
      color: #888;
      margin-top: 0.8mm;
      line-height: 1.4;
    }
    .rcp-footer-num {
      font-size: 5.5pt;
      color: #bbb;
      margin-top: 1.5mm;
      letter-spacing: 0.3pt;
    }
  </style>
</head>
<body>
<div class="rcp">

  <!-- ── Brand Header ── -->
  <div class="rcp-brand">
    <div class="rcp-brand-badge">
      <span class="rcp-brand-initial">${data.companyName.charAt(0)}</span>
    </div>
    <div class="rcp-company-name" dir="auto">${data.companyName}</div>
    ${data.companyLines.map((line) => `<div class="rcp-company-detail" dir="auto">${line}</div>`).join('')}
  </div>

  <hr class="sep sep-tight sep-solid" />

  <!-- ── Receipt Title Band ── -->
  <div class="rcp-title-band" dir="ltr">
    <span class="rcp-badge">${L.receipt}</span>
    <div style="text-align:right;">
      <div class="rcp-doc-num"># ${data.documentNumber}</div>
      <div class="rcp-doc-date">${data.date}</div>
    </div>
  </div>

  <hr class="sep sep-tight sep-dash" />

  <!-- ── Customer ── -->
  <div class="rcp-customer">
    <div class="rcp-customer-label">${L.client}</div>
    <div class="rcp-customer-value" dir="auto">${data.customerName}</div>
    ${data.customerPhone ? `<div class="rcp-customer-meta">${data.customerPhone}</div>` : ''}
  </div>

  <hr class="sep sep-tight sep-dash" />

  <!-- ── Items ── -->
  <table class="rcp-table">
    <thead>
      <tr>
        <th class="th-desc">${L.designation}</th>
        <th class="th-total">${L.total}</th>
      </tr>
    </thead>
    <tbody>
      ${data.itemsHtml}
    </tbody>
  </table>

  <!-- ── Summary ── -->
  <div class="rcp-summary">
    <span><b>${data.totalProducts}</b> ${data.totalProducts > 1 ? L.articlesPl : L.articles}</span>
    <span>${L.totalQty} : <b>${data.totalQty}</b></span>
  </div>

  <!-- ── Totals ── -->
  <table class="rcp-totals-table">
    <tbody>
      ${
        !data.hideVAT
          ? `<tr class="t-sub">
             <td class="t-label">${L.subtotal}</td>
             <td class="t-amount">${data.subtotal} ${isRTL ? 'د.م' : 'DH'}</td>
           </tr>
           ${discountRowHtml}
           <tr class="t-sub">
             <td class="t-label">${L.tva20}</td>
             <td class="t-amount">${data.tax} ${isRTL ? 'د.م' : 'DH'}</td>
           </tr>`
          : discountRowHtml
      }
      <tr class="t-grand">
        <td class="t-label">${L.total}</td>
        <td class="t-amount">${data.total} ${isRTL ? 'د.م' : 'DH'}</td>
      </tr>
    </tbody>
  </table>

  <hr class="sep sep-dash" />

  <!-- ── Footer ── -->
  <div class="rcp-footer">
    <div class="rcp-footer-thanks">${L.thanks}</div>
    <div class="rcp-footer-sub">${L.seeYouSoon} · ${data.companyName}</div>
    <div class="rcp-footer-num">${data.documentNumber}</div>
  </div>

</div>
</body>
</html>
  `;
}
