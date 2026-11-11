import {
  OrderPrintData,
  PaymentStatusView,
  PRINT_FONTS_LINK,
  PRINT_FONT_FAMILY,
  PRINT_MONO_FAMILY,
  esc,
  phoneIcon,
  pinIcon,
} from './order-print.shared';

/** Page margins of the A5 delivery note; the bottom one holds the page number. */
export const DELIVERY_NOTE_MARGINS = {
  top: '7mm',
  bottom: '11mm',
  left: '8mm',
  right: '8mm',
};

/**
 * Every option defaults to the sales delivery-note behaviour, so the same
 * layout also prints invoices, quotes and the purchase documents.
 */
export interface DeliveryNoteTemplateData extends Omit<
  OrderPrintData,
  'status'
> {
  barcodeSvg: string;
  /** Payment badge; omitted for documents without a payment (quotes). */
  status?: PaymentStatusView;
  /** Key above the number, e.g. "N° FACTURE". */
  numberLabel?: string;
  /** Extra header dates such as the due date or quote validity. */
  extraDates?: Array<{ label: string; value: string }>;
  /** Key of the client/supplier block, e.g. "CLIENT" or "FOURNISSEUR". */
  partyLabel?: string;
  partyIce?: string;
  /** Dashed "repère" line for the delivery person. */
  showLandmark?: boolean;
  /** Key of the grand-total bar, e.g. "TOTAL TTC". */
  totalLabel?: string;
  notes?: string;
  /** Demande de prix: no price columns, the bar shows the quantity asked. */
  hidePrices?: boolean;
}

const NAVY = '#14264f';
const GOLD = '#b8872b';
const MUTED = '#555';
const RULE = '#e4e0d6';

/**
 * A5 sales/purchase document layout. Originally the "Bon de livraison" built
 * for the delivery person and the customer, it now also prints invoices,
 * quotes, factures d'achat, demandes de prix and bons d'achat:
 * big client block, explicit payment badge, quantities in chips and the
 * total spelled out. Long orders flow onto extra pages (the table header
 * repeats); the thank-you/barcode footer sits at the bottom of the last page.
 */
export function renderDeliveryNoteTemplate(
  data: DeliveryNoteTemplateData,
): string {
  const ar = data.lang === 'ar';
  const L = {
    orderNo: ar ? 'رقم الطلب' : 'N° DE COMMANDE',
    date: ar ? 'التاريخ' : 'DATE',
    deliverTo: ar ? 'التسليم إلى' : 'LIVRER À',
    landmark: ar ? 'علامة / إرشاد :' : 'Repère / indication :',
    payment: ar ? 'الأداء' : 'PAIEMENT',
    product: ar ? 'المنتج' : 'PRODUIT',
    qty: ar ? 'الكمية' : 'QTÉ',
    price: ar ? 'الثمن' : 'PRIX',
    total: ar ? 'المجموع' : 'TOTAL',
    toPay: ar ? 'المبلغ الواجب أداؤه' : 'TOTAL À PAYER',
    thanks: ar ? 'شكراً لثقتكم!' : 'Merci pour votre confiance !',
    questions: ar ? 'لأي سؤال، اتصلوا بـ' : 'Pour toute question, appelez le',
    notes: ar ? 'ملاحظات' : 'NOTES',
    qtyAsked: ar ? 'إجمالي الكمية المطلوبة' : 'QUANTITÉ TOTALE DEMANDÉE',
  };
  const { company, client, status } = data;
  const isDelivery = !data.partyLabel;
  const showLandmark = data.showLandmark ?? isDelivery;
  const hidePrices = !!data.hidePrices;

  const logoHtml = company.logoSrc
    ? `<img class="logo" src="${esc(company.logoSrc)}" alt="">`
    : `<div class="logo logo-fallback">${esc(company.name.charAt(0) || 'M')}</div>`;

  const rowsHtml = data.items
    .map(
      (it, i) => `
      <tr class="${i % 2 ? 'alt' : ''}">
        <td class="c-name">
          <div class="it-name" dir="auto">${esc(it.name)}</div>
          ${it.extras ? `<div class="it-sub">${esc(it.extras)}</div>` : ''}
        </td>
        <td class="c-qty"><span class="qty-chip">${esc(it.qty)}</span></td>
        ${
          hidePrices
            ? ''
            : `<td class="c-num it-price">${esc(it.price)}</td>
        <td class="c-num it-total">${esc(it.total)}</td>`
        }
      </tr>`,
    )
    .join('');

  const breakdownHtml =
    !hidePrices && data.breakdown.length
      ? `<div class="breakdown">${data.breakdown
          .map(
            (b) =>
              `<div class="bd-row"><span>${esc(b.label)}</span><span class="num">${esc(b.value)}</span></div>`,
          )
          .join('')}</div>`
      : '';

  return `<!DOCTYPE html>
<html lang="${data.lang}" dir="${ar ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  ${PRINT_FONTS_LINK}
  <title>${esc(data.title)} ${esc(data.documentNumber)}</title>
  <style>
    @page { size: A5; margin: ${DELIVERY_NOTE_MARGINS.top} ${DELIVERY_NOTE_MARGINS.right} ${DELIVERY_NOTE_MARGINS.bottom} ${DELIVERY_NOTE_MARGINS.left}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; }
    body {
      font-family: ${PRINT_FONT_FAMILY};
      color: #111;
      font-size: 10px;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .num { font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; }
    .sheet {
      display: flex;
      flex-direction: column;
      gap: 8px;
      /* A5 height minus page margins: pushes the footer to the page bottom */
      min-height: calc(210mm - ${DELIVERY_NOTE_MARGINS.top} - ${DELIVERY_NOTE_MARGINS.bottom} - 1px);
    }

    /* ── Header ───────────────────────────── */
    .hdr {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
      border-bottom: 2px solid ${NAVY}; padding-bottom: 7px;
    }
    .brand { display: flex; gap: 8px; align-items: center; min-width: 0; }
    .logo { width: 38px; height: 38px; object-fit: contain; flex: none; }
    .logo-fallback {
      display: flex; align-items: center; justify-content: center;
      background: ${NAVY}; color: #fff; border-radius: 7px;
      font-weight: 700; font-size: 20px; text-transform: uppercase;
    }
    .brand-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .co-name { font-weight: 700; font-size: 13px; line-height: 1.15; color: ${NAVY}; }
    .co-line { font-size: 9px; color: ${MUTED}; line-height: 1.25; }
    .co-phone { display: flex; align-items: center; gap: 4px; font-weight: 700; font-size: 11px; }
    .doc { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; text-align: end; flex: none; }
    .doc-title { font-weight: 700; font-size: 14px; line-height: 1; color: ${NAVY}; letter-spacing: .04em; }
    .doc-k { font-size: 8.5px; color: ${MUTED}; letter-spacing: .08em; }
    .doc-no { display: flex; gap: 5px; align-items: baseline; }
    .doc-no-v {
      font: 700 11.5px/1.1 ${PRINT_MONO_FAMILY}; color: #111;
      background: #f2f0ea; padding: 2px 6px; border-radius: 3px;
    }
    .doc-date { display: flex; gap: 5px; align-items: baseline; }
    .doc-date-v { font-weight: 700; font-size: 11px; }

    /* ── Client + payment ─────────────────── */
    .meta { display: grid; grid-template-columns: minmax(0, 1fr) 112px; gap: 8px; align-items: stretch; }
    .meta.solo { grid-template-columns: minmax(0, 1fr); }
    .client-ice { font-size: 9.5px; color: ${MUTED}; }
    .notes { border-inline-start: 3px solid ${GOLD}; background: #faf9f6; border-radius: 4px; padding: 5px 9px; break-inside: avoid; page-break-inside: avoid; }
    .notes-k { font-weight: 700; font-size: 8.5px; color: ${GOLD}; letter-spacing: .12em; margin-bottom: 2px; }
    .notes-v { font-size: 10px; line-height: 1.35; white-space: pre-line; }
    .client {
      display: flex; flex-direction: column; gap: 3px;
      background: #f7f5f0; border-radius: 6px; padding: 7px 10px;
    }
    .client-k { display: flex; align-items: center; gap: 4px; font-weight: 700; font-size: 8.5px; color: ${GOLD}; letter-spacing: .12em; }
    .client-name { font-weight: 700; font-size: 14px; line-height: 1.15; }
    .client-phone { display: flex; align-items: center; gap: 5px; font-weight: 700; font-size: 12px; }
    .client-addr { font-size: 10.5px; line-height: 1.3; }
    .landmark {
      display: flex; gap: 6px; align-items: baseline;
      border-top: 1px dashed #cfc9bb; padding-top: 4px; margin-top: 1px;
    }
    .landmark-k { font-size: 8.5px; color: ${MUTED}; white-space: nowrap; }
    .landmark-line { flex: 1; border-bottom: 1px solid #cfc9bb; height: 9px; }
    .pay {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
      border-radius: 6px; padding: 6px; text-align: center;
    }
    .pay-k { font-size: 8px; letter-spacing: .12em; opacity: .9; }
    .pay-glyph {
      width: 22px; height: 22px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 15px; line-height: 1;
    }
    .pay-label { font-weight: 700; font-size: 13px; line-height: 1.05; letter-spacing: .03em; }
    .pay-hint { font-size: 8.5px; line-height: 1.25; opacity: .9; }

    /* ── Items ────────────────────────────── */
    table.items { width: 100%; border-collapse: separate; border-spacing: 0; }
    table.items thead { display: table-header-group; }
    table.items th {
      background: ${NAVY}; color: #fff; font-weight: 700; font-size: 8.5px;
      letter-spacing: .1em; padding: 4px 8px; text-align: start;
    }
    table.items th:first-child { border-start-start-radius: 4px; }
    table.items th:last-child { border-start-end-radius: 4px; }
    table.items th.c-qty { text-align: center; }
    table.items th.c-num { text-align: end; }
    table.items tr { break-inside: avoid; page-break-inside: avoid; }
    table.items td { padding: 3.5px 8px; border-bottom: 1px solid ${RULE}; vertical-align: middle; }
    table.items tr.alt td { background: #faf9f6; }
    .c-qty { width: 46px; text-align: center; }
    .c-num { text-align: end; white-space: nowrap; font-variant-numeric: tabular-nums; }
    td.c-num { width: 72px; }
    .it-name { font-weight: 700; font-size: 10.5px; line-height: 1.2; }
    .it-sub { font-size: 8.5px; color: #777; margin-top: 1px; }
    .qty-chip {
      display: block; font-weight: 700; font-size: 11.5px; line-height: 1; color: ${NAVY};
      background: #eef1f7; border-radius: 3px; padding: 2px 0;
    }
    .it-price { font-size: 10px; color: #333; }
    .it-total { font-weight: 700; font-size: 10.5px; }
    .summary { display: flex; justify-content: space-between; padding: 4px 8px 0; font-size: 9px; color: ${MUTED}; }

    /* ── Totals ───────────────────────────── */
    .totals { display: flex; flex-direction: column; gap: 4px; break-inside: avoid; page-break-inside: avoid; }
    .breakdown { display: flex; flex-direction: column; gap: 2px; align-self: flex-end; min-width: 180px; padding: 0 4px; }
    .bd-row { display: flex; justify-content: space-between; gap: 12px; font-size: 10px; color: #333; }
    .grand {
      display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center;
      background: ${NAVY}; color: #fff; border-radius: 6px; padding: 7px 12px;
    }
    .grand-k { font-weight: 700; font-size: 9.5px; letter-spacing: .12em; color: #e3c889; }
    .grand-words { font-size: 9px; line-height: 1.3; color: #d9dde8; margin-top: 2px; }
    .grand-v { font-weight: 700; font-size: 18px; line-height: 1; white-space: nowrap; }
    .grand-cur { font-size: 12px; color: #e3c889; }

    /* ── Footer ───────────────────────────── */
    .ftr {
      margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px;
      border-top: 1px solid ${RULE}; padding-top: 6px;
      break-inside: avoid; page-break-inside: avoid;
    }
    .ftr-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .thanks { font-weight: 700; font-size: 11px; color: ${GOLD}; }
    .ftr-line { font-size: 9px; line-height: 1.3; color: ${MUTED}; }
    .ftr-legal { font-size: 8px; color: #888; }
    .barcode { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: none; }
    .barcode svg { display: block; }
    .barcode-txt { font: 400 8.5px/1 ${PRINT_MONO_FAMILY}; color: #333; letter-spacing: .2em; }
  </style>
</head>
<body>
<div class="sheet">

  <div class="hdr">
    <div class="brand">
      ${logoHtml}
      <div class="brand-txt">
        <div class="co-name" dir="auto">${esc(company.name)}</div>
        ${company.addressLine ? `<div class="co-line" dir="auto">${esc(company.addressLine)}</div>` : ''}
        ${company.phone ? `<div class="co-phone">${phoneIcon(11, NAVY)}<span class="num">${esc(company.phone)}</span></div>` : ''}
        ${company.email ? `<div class="co-line">${esc(company.email)}</div>` : ''}
      </div>
    </div>
    <div class="doc">
      <div class="doc-title">${esc(data.title)}</div>
      <div class="doc-no">
        <div class="doc-k">${esc(data.numberLabel ?? L.orderNo)}</div>
        <div class="doc-no-v num">${esc(data.documentNumber)}</div>
      </div>
      <div class="doc-date">
        <span class="doc-k">${L.date}</span>
        <span class="doc-date-v num">${esc(data.date)}</span>
      </div>
      ${(data.extraDates ?? [])
        .map(
          (d) => `<div class="doc-date">
        <span class="doc-k">${esc(d.label)}</span>
        <span class="doc-date-v num">${esc(d.value)}</span>
      </div>`,
        )
        .join('')}
    </div>
  </div>

  <div class="meta${status ? '' : ' solo'}">
    <div class="client">
      <div class="client-k">${isDelivery ? pinIcon(10, GOLD) : ''}${esc(data.partyLabel ?? L.deliverTo)}</div>
      <div class="client-name" dir="auto">${esc(client.name)}</div>
      ${client.phone ? `<div class="client-phone">${phoneIcon(12, NAVY)}<span class="num">${esc(client.phone)}</span></div>` : ''}
      ${client.address ? `<div class="client-addr" dir="auto">${esc(client.address)}</div>` : ''}
      ${data.partyIce ? `<div class="client-ice">ICE : <span class="num">${esc(data.partyIce)}</span></div>` : ''}
      ${
        showLandmark
          ? `<div class="landmark">
        <span class="landmark-k">${L.landmark}</span>
        <span class="landmark-line"></span>
      </div>`
          : ''
      }
    </div>
    ${
      status
        ? `<div class="pay" style="background:${status.bg};color:${status.fg}">
      <div class="pay-k">${L.payment}</div>
      <div class="pay-glyph" style="background:${status.fg};color:${status.bg}">${status.glyph}</div>
      <div class="pay-label">${esc(status.label)}</div>
      <div class="pay-hint">${esc(status.hint)}</div>
    </div>`
        : ''
    }
  </div>

  <div>
    <table class="items">
      <thead>
        <tr>
          <th>${L.product}</th>
          <th class="c-qty">${L.qty}</th>
          ${
            hidePrices
              ? ''
              : `<th class="c-num">${L.price}</th>
          <th class="c-num">${L.total}</th>`
          }
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="summary"><span>${esc(data.linesLabel)}</span><span>${esc(data.unitsLabel)}</span></div>
  </div>

  <div class="totals">
    ${breakdownHtml}
    <div class="grand">
      ${
        hidePrices
          ? `<div><div class="grand-k">${L.qtyAsked}</div></div>
      <div class="grand-v num">${esc(data.unitsLabel)}</div>`
          : `<div>
        <div class="grand-k">${esc(data.totalLabel ?? L.toPay)}</div>
        ${data.totalWords ? `<div class="grand-words">${esc(data.totalWords)}</div>` : ''}
      </div>
      <div class="grand-v num">${esc(data.grandTotal)} <span class="grand-cur">${esc(data.currency)}</span></div>`
      }
    </div>
  </div>

  ${
    data.notes?.trim()
      ? `<div class="notes"><div class="notes-k">${L.notes}</div><div class="notes-v" dir="auto">${esc(data.notes.trim())}</div></div>`
      : ''
  }

  <div class="ftr">
    <div class="ftr-txt">
      <div class="thanks">${L.thanks}</div>
      ${company.phone ? `<div class="ftr-line">${L.questions} <span class="num">${esc(company.phone)}</span></div>` : ''}
      ${company.legalLine ? `<div class="ftr-legal">${esc(company.legalLine)}</div>` : ''}
    </div>
    ${
      data.barcodeSvg
        ? `<div class="barcode">${data.barcodeSvg}<div class="barcode-txt">${esc(data.documentNumber)}</div></div>`
        : ''
    }
  </div>

</div>
</body>
</html>`;
}

/** Playwright footer: page counter only (the rest of the footer is in-flow). */
export function renderDeliveryNotePageFooter(lang: 'fr' | 'ar'): string {
  const page = lang === 'ar' ? 'صفحة' : 'Page';
  return `<div style="width:100%;padding:0 8mm 3mm;font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#777;text-align:${lang === 'ar' ? 'left' : 'right'};">
    ${page} <span class="pageNumber"></span> / <span class="totalPages"></span>
  </div>`;
}
