export function getDocumentStyles(): string {
  return `
    <style>
      /* ── Web fonts ─────────────────────────────────────────────────── */
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&display=block');

      /* ── Design tokens ─────────────────────────────────────────────── */
      :root {
        --accent: #1B5E7B;
        --accent-light: #E8F0F4;
        --text-primary: #1A1A1A;
        --text-secondary: #555555;
        --text-muted: #888888;
        --border: #E0E0E0;
        --border-light: #EEEEEE;
        --bg-alt: #F7F8FA;
        --white: #FFFFFF;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: "Noto Sans", "Noto Sans Arabic", "Helvetica Neue", Arial, sans-serif;
        background: var(--white);
        width: 100%;
        font-size: 8pt;
        color: var(--text-primary);
        line-height: 1.4;
        -webkit-font-smoothing: antialiased;
      }

      /* ── Bidirectional text ────────────────────────────────────────── */
      .bidi { unicode-bidi: plaintext; text-align: start; }

      /* ── Page wrapper ──────────────────────────────────────────────── */
      .invoice-page { background: var(--white); }
      main.content-wrapper { padding: 0; }

      /* ── Customer / Supplier block ─────────────────────────────────── */
      section.customer-section {
        padding: 0;
        page-break-after: avoid;
      }

      .customer-grid {
        margin-bottom: 3mm;
      }

      .bill-to {
        width: 100%;
      }

      .section-label {
        font-size: 6.5pt;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8pt;
        color: var(--accent);
        margin-bottom: 1.5mm;
      }

      .info-box {
        font-size: 8.5pt;
        line-height: 1.55;
        padding: 2.5mm 3mm;
        background: var(--bg-alt);
        border-left: 2pt solid var(--accent);
        border-radius: 0 2pt 2pt 0;
        unicode-bidi: plaintext;
        text-align: start;
      }

      .info-box .customer-name {
        font-weight: 700;
        font-size: 9pt;
        color: var(--text-primary);
        margin-bottom: 0.5mm;
      }

      .info-box .customer-detail {
        font-size: 7.5pt;
        color: var(--text-secondary);
      }

      /* ── Items table ───────────────────────────────────────────────── */
      section.table-section {
        padding: 0;
        break-inside: auto;
      }

      .invoice-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 0;
        page-break-inside: auto;
      }

      .table-header {
        display: table-header-group;
        break-inside: avoid;
        break-after: avoid;
      }

      .table-header th {
        background: var(--accent);
        color: var(--white);
        font-size: 7pt;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.4pt;
        padding: 2mm 1.5mm;
        border: none;
      }

      .table-header th:first-child { border-radius: 2pt 0 0 0; }
      .table-header th:last-child  { border-radius: 0 2pt 0 0; }

      tbody { display: table-row-group; }

      .table-row {
        page-break-inside: avoid;
      }

      .table-row td {
        padding: 1.8mm 1.5mm;
        vertical-align: middle;
        border-bottom: 0.5pt solid var(--border-light);
        font-size: 8pt;
      }

      .table-row:nth-child(even) td {
        background: var(--bg-alt);
      }

      .table-row .cell-desc {
        text-align: left;
      }

      /* Number cells: monospace for alignment */
      .table-row td.num {
        font-family: "Noto Sans", monospace;
        font-variant-numeric: tabular-nums;
      }

      /* ── Totals block ──────────────────────────────────────────────── */
      .totals-section {
        width: 50%;
        margin-left: auto;
        margin-top: 3mm;
        margin-bottom: 3mm;
        page-break-inside: avoid;
        border-radius: 2pt;
        overflow: hidden;
        border: 0.5pt solid var(--border);
      }

      .totals-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.2mm 2.5mm;
        font-size: 8pt;
        border-bottom: 0.5pt solid var(--border-light);
      }

      .totals-row:last-child { border-bottom: none; }

      .totals-label {
        font-weight: 600;
        color: var(--text-secondary);
        font-size: 7.5pt;
      }

      .totals-value {
        font-family: "Noto Sans", monospace;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        direction: ltr;
        color: var(--text-primary);
      }

      .totals-grand {
        background: var(--accent);
        padding: 2mm 2.5mm;
      }

      .totals-grand .totals-label {
        color: var(--white);
        font-size: 9pt;
        font-weight: 700;
      }

      .totals-grand .totals-value {
        color: var(--white);
        font-size: 10pt;
        font-weight: 700;
      }

      /* ── Notes ─────────────────────────────────────────────────────── */
      .notes-block {
        margin-top: 3mm;
        padding: 2mm 3mm;
        background: var(--bg-alt);
        border-radius: 2pt;
        border: 0.5pt solid var(--border);
      }

      .notes-block .notes-title {
        font-size: 6.5pt;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.6pt;
        color: var(--accent);
        margin-bottom: 1mm;
      }

      .notes-block .notes-body {
        font-size: 7.5pt;
        color: var(--text-secondary);
        line-height: 1.45;
        unicode-bidi: plaintext;
        text-align: start;
      }
    </style>
  `;
}
