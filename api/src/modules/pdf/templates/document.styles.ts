export function getDocumentStyles(): string {
  return `
    <style>
      /* ── Arabic / Latin professional font ──────────────────────────── */
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&display=block');

      * {
        box-sizing: border-box;
      }

      body {
        font-family: "Noto Sans Arabic", "Noto Sans", "Helvetica Neue", "Arial", sans-serif;
        background-color: #ffffff;
        width: 100%;
        margin: 0;
        padding: 0;
        font-size: 9pt;
        color: #000000;
        line-height: 1.4;
      }

      /* ── Bidirectional text helpers ─────────────────────────────────── */
      .bidi {
        unicode-bidi: plaintext;
        text-align: start;
      }

      .invoice-page {
        background-color: #ffffff;
        margin: 0;
        padding: 0;
      }

      main.content-wrapper {
        margin: 0;
        padding: 0;
      }

      section.customer-section {
        padding: 2mm 0 0 0;
        page-break-after: avoid;
      }

      .customer-grid {
        display: block;
        margin-bottom: 3mm;
      }

      .bill-to {
        width: 100%;
      }

      .section-title {
        font-size: 8pt;
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 2mm;
        color: #666666;
      }

      .info-box {
        font-size: 10pt;
        line-height: 1.5;
        border: 1px solid #DDDDDD;
        padding: 3mm;
        background-color: #FAFAFA;
        unicode-bidi: plaintext;
        text-align: start;
      }

      section.table-section {
        padding: 0;
        break-inside: auto;
      }

      .invoice-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 3mm;
        page-break-inside: auto;
      }

      .table-header {
        background-color: #F8F9FA;
        display: table-header-group;
        break-inside: avoid;
        break-after: avoid;
      }

      .table-header th {
        border: 0.75pt solid #CCCCCC;
        padding: 2mm 2mm;
        font-weight: 600;
        color: #000000;
      }

      .table-row td {
        border: 1px solid #DDDDDD;
        padding: 2mm 2mm;
        vertical-align: middle;
      }

      .table-row .cell-desc {
        unicode-bidi: plaintext;
        text-align: start;
      }

      .table-row {
        page-break-inside: avoid;
      }

      tbody {
        display: table-row-group;
      }

      .totals-section {
        width: 50%;
        margin-left: auto;
        margin-top: 4mm;
        margin-bottom: 4mm;
        page-break-inside: avoid;
        border: 0.5pt solid #DDDDDD;
      }

      .totals-row {
        display: flex;
        justify-content: space-between;
        padding: 1mm 2mm;
        background-color: #F8F9FA;
        border-bottom: 0.5pt solid #DDDDDD;
      }

      .totals-row:last-child {
        border-bottom: none;
      }

      .totals-label {
        font-weight: 600;
      }

      .totals-value {
        font-family: "Noto Sans Arabic", "Noto Sans", monospace;
        font-weight: 600;
        direction: ltr;
      }

      .totals-grand {
        background-color: #E5E7EB;
        padding: 1.5mm 2mm;
        font-size: 10pt;
      }
    </style>
  `;
}
