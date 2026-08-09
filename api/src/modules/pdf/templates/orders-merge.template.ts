/**
 * A4 consolidated orders recap ("merge").
 *
 * Body only — the page header and footer come from the shared
 * renderHeaderTemplate / renderFooterTemplate used by every other document,
 * so branding stays identical. Styles are declared here rather than reusing
 * getDocumentStyles() because those are tuned for the A5 single-document
 * layout; the tokens and font stack are kept in sync on purpose.
 */

export interface OrdersMergeItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OrdersMergeOrder {
  id: number;
  orderNumber: string;
  partnerName: string;
  total: number;
  items: OrdersMergeItem[];
}

export interface OrdersMergeTemplateData {
  orders: OrdersMergeOrder[];
  orderCount: number;
  grandTotal: number;
  totalQuantity: number;
  lang?: 'fr' | 'ar';
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(value: number): string {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

function qty(value: number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

export function renderOrdersMergeTemplate(
  data: OrdersMergeTemplateData,
): string {
  const isRTL = data.lang === 'ar';

  const L = isRTL
    ? {
        client: 'العميل',
        total: 'المجموع',
        designation: 'التسمية',
        qty: 'الكمية',
        unitPrice: 'سعر الوحدة',
        lineTotal: 'المجموع',
        noItems: 'لا توجد عناصر',
        summary: 'ملخص',
        orderCount: 'عدد الطلبات',
        totalQuantity: 'إجمالي الكمية',
        grandTotal: 'المجموع الإجمالي',
      }
    : {
        client: 'Client',
        total: 'Total',
        designation: 'Désignation',
        qty: 'Qté',
        unitPrice: 'P.U.',
        lineTotal: 'Total',
        noItems: 'Aucun article',
        summary: 'Récapitulatif',
        orderCount: 'Nombre de commandes',
        totalQuantity: 'Quantité totale',
        grandTotal: 'Total général',
      };

  const ordersHtml = data.orders
    .map((order) => {
      const rowsHtml = order.items.length
        ? order.items
            .map(
              (item, index) => `
              <tr>
                <td class="col-idx">${index + 1}</td>
                <td class="col-desc bidi">${esc(item.description)}</td>
                <td class="col-num">${qty(item.quantity)}</td>
                <td class="col-num">${money(item.unitPrice)}</td>
                <td class="col-num col-total">${money(item.total)}</td>
              </tr>`,
            )
            .join('')
        : `<tr><td class="col-empty" colspan="5">${L.noItems}</td></tr>`;

      return `
        <section class="order-block">
          <div class="order-head">
            <div class="order-number">${esc(order.orderNumber)}</div>
            <div class="order-partner bidi">
              <span class="order-partner-label">${L.client}:</span>
              ${esc(order.partnerName)}
            </div>
            <div class="order-total">
              <span class="order-total-label">${L.total}</span>
              <span class="order-total-value">${money(order.total)}</span>
            </div>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-idx">#</th>
                <th class="col-desc">${L.designation}</th>
                <th class="col-num">${L.qty}</th>
                <th class="col-num">${L.unitPrice}</th>
                <th class="col-num">${L.lineTotal}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </section>`;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="${isRTL ? 'ar' : 'fr'}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&display=block');

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
            font-size: 9pt;
            color: var(--text-primary);
            line-height: 1.45;
            -webkit-font-smoothing: antialiased;
          }

          .bidi { unicode-bidi: plaintext; text-align: start; }

          /* ── One block per order ─────────────────────────────────── */
          .order-block {
            margin-bottom: 6mm;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .order-head {
            display: flex;
            align-items: baseline;
            gap: 4mm;
            padding: 2mm 3mm;
            background: var(--accent-light);
            border-${isRTL ? 'right' : 'left'}: 2.5pt solid var(--accent);
            border-radius: ${isRTL ? '0 2pt 2pt 0' : '2pt 0 0 2pt'};
          }

          .order-number {
            font-weight: 700;
            font-size: 10pt;
            color: var(--accent);
            white-space: nowrap;
          }

          .order-partner {
            flex: 1;
            color: var(--text-secondary);
            overflow-wrap: anywhere;
          }

          .order-partner-label {
            color: var(--text-muted);
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
          }

          .order-total {
            white-space: nowrap;
            text-align: ${isRTL ? 'left' : 'right'};
          }

          .order-total-label {
            color: var(--text-muted);
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
            margin-${isRTL ? 'left' : 'right'}: 1.5mm;
          }

          .order-total-value {
            font-weight: 700;
            font-size: 10pt;
            color: var(--text-primary);
          }

          /* ── Item table ──────────────────────────────────────────── */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1.5mm;
          }

          .items-table thead th {
            background: var(--bg-alt);
            color: var(--text-secondary);
            font-size: 7.5pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
            padding: 1.5mm 2mm;
            border-bottom: 0.5pt solid var(--border);
            text-align: ${isRTL ? 'right' : 'left'};
          }

          .items-table tbody td {
            padding: 1.2mm 2mm;
            border-bottom: 0.5pt solid var(--border-light);
            vertical-align: top;
          }

          .items-table tbody tr:last-child td { border-bottom: none; }

          .col-idx {
            width: 8mm;
            color: var(--text-muted);
            text-align: ${isRTL ? 'right' : 'left'} !important;
          }

          .col-desc { overflow-wrap: anywhere; }

          .col-num {
            width: 22mm;
            text-align: ${isRTL ? 'left' : 'right'} !important;
            white-space: nowrap;
          }

          .col-total { font-weight: 600; }

          .col-empty {
            text-align: center !important;
            color: var(--text-muted);
            font-style: italic;
            padding: 2mm;
          }

          /* ── Grand summary ───────────────────────────────────────── */
          .summary {
            margin-top: 4mm;
            border-top: 1pt solid var(--accent);
            padding-top: 2.5mm;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .summary-title {
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            color: var(--accent);
            margin-bottom: 1.5mm;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 1mm 0;
            color: var(--text-secondary);
          }

          .summary-row.grand {
            border-top: 0.5pt solid var(--border);
            margin-top: 1mm;
            padding-top: 2mm;
            font-size: 11pt;
            font-weight: 700;
            color: var(--text-primary);
          }
        </style>
      </head>
      <body>
        ${ordersHtml}
        <div class="summary">
          <div class="summary-title">${L.summary}</div>
          <div class="summary-row">
            <span>${L.orderCount}</span><span>${data.orderCount}</span>
          </div>
          <div class="summary-row">
            <span>${L.totalQuantity}</span><span>${qty(data.totalQuantity)}</span>
          </div>
          <div class="summary-row grand">
            <span>${L.grandTotal}</span><span>${money(data.grandTotal)}</span>
          </div>
        </div>
      </body>
    </html>`;
}
