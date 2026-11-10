import {
  OrderPrintData,
  PRINT_FONTS_LINK,
  PRINT_FONT_FAMILY,
  PRINT_MONO_FAMILY,
  esc,
} from './order-print.shared';

/**
 * Printable width of an 80mm thermal roll (576 dots @ 203dpi).
 * Rendering at the full 80mm makes printers clip the right edge.
 */
export const RECEIPT_WIDTH_MM = 72;

export interface ReceiptTemplateData extends OrderPrintData {
  barcodeSvg: string;
}

/**
 * 80mm thermal ticket. Pure black on white (thermal heads can't print grey
 * reliably), large type for the client, payment state and total.
 */
export function renderReceiptTemplate(data: ReceiptTemplateData): string {
  const ar = data.lang === 'ar';
  const L = {
    date: ar ? 'التاريخ' : 'Date',
    phone: ar ? 'الهاتف' : 'Tél',
    deliverTo: ar ? 'التسليم إلى' : 'LIVRER À',
    total: ar ? 'المجموع' : 'TOTAL',
    thanks: ar ? 'شكراً لثقتكم!' : 'Merci pour votre confiance !',
  };
  const { company, client, status } = data;

  const companySub = [
    company.addressLine,
    company.phone ? `${L.phone} ${company.phone}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const itemsHtml = data.items
    .map(
      (it) => `
      <div class="it">
        <div class="it-name" dir="auto">${esc(it.name)}</div>
        <div class="it-line">
          <span class="it-calc num"><strong>${esc(it.qty)}</strong> × ${esc(it.price)}</span>
          <span class="it-total num">${esc(it.total)}</span>
        </div>
        ${it.extras ? `<div class="it-sub">${esc(it.extras)}</div>` : ''}
      </div>`,
    )
    .join('');

  const breakdownHtml = data.breakdown.length
    ? `<div class="bd">${data.breakdown
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
    @page { size: ${RECEIPT_WIDTH_MM}mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; break-inside: avoid; page-break-inside: avoid; }
    body {
      font-family: ${PRINT_FONT_FAMILY};
      background: #fff;
      color: #000;
      width: ${RECEIPT_WIDTH_MM}mm;
      margin: 0 auto;
      font-size: 10.5px;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .num { font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; }
    .tk { display: flex; flex-direction: column; gap: 6px; padding: 3mm 2.5mm 4mm; }

    .brand { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
    .logo { width: 34px; height: 34px; object-fit: contain; filter: grayscale(1) contrast(1.3); }
    .logo-fallback {
      display: flex; align-items: center; justify-content: center;
      background: #000; color: #fff; border-radius: 6px;
      font-weight: 700; font-size: 18px; text-transform: uppercase;
    }
    .co-name { font-weight: 700; font-size: 13px; line-height: 1.15; }
    .co-sub { font-size: 9.5px; line-height: 1.25; }

    .title {
      border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 4px 0;
      display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center;
    }
    .title-k { font-weight: 700; font-size: 11.5px; letter-spacing: .06em; }
    .title-no { font: 700 12px/1 ${PRINT_MONO_FAMILY}; }
    .title-date { font-size: 10.5px; }

    .pay {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      border: 1.5px solid #000; border-radius: 4px; padding: 4px;
    }
    .pay-glyph {
      width: 17px; height: 17px; border-radius: 50%; background: #000; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 11px; line-height: 1; flex: none;
    }
    .pay-label { font-weight: 700; font-size: 12.5px; letter-spacing: .04em; }
    .pay-hint { font-size: 9.5px; text-align: center; margin-top: -3px; }

    .client { display: flex; flex-direction: column; gap: 1px; }
    .client-k { font-weight: 700; font-size: 8.5px; letter-spacing: .12em; }
    .client-name { font-weight: 700; font-size: 12.5px; line-height: 1.15; }
    .client-phone { font-weight: 700; font-size: 11px; }
    .client-addr { font-size: 10px; line-height: 1.25; }

    .items { display: flex; flex-direction: column; border-top: 1px dashed #000; }
    .it { display: flex; flex-direction: column; gap: 1px; padding: 3px 0; border-bottom: 1px dashed #000; }
    .it-name { font-weight: 700; font-size: 11px; line-height: 1.2; }
    .it-line { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
    .it-calc { white-space: nowrap; font-size: 10.5px; }
    .it-calc strong { font-size: 11.5px; }
    .it-total { white-space: nowrap; font-weight: 700; font-size: 11.5px; }
    .it-sub { font-size: 9px; }

    .summary { display: flex; justify-content: space-between; font-size: 9.5px; margin-top: -2px; }
    .bd { display: flex; flex-direction: column; gap: 1px; }
    .bd-row { display: flex; justify-content: space-between; gap: 6px; font-size: 10.5px; }

    .grand { display: flex; flex-direction: column; gap: 3px; background: #000; color: #fff; padding: 5px 8px; border-radius: 4px; }
    .grand-row { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
    .grand-k { font-weight: 700; font-size: 10.5px; letter-spacing: .1em; }
    .grand-v { font-weight: 700; font-size: 16px; line-height: 1; white-space: nowrap; }
    .grand-words { font-size: 9px; line-height: 1.25; text-align: end; }

    .barcode { display: flex; flex-direction: column; align-items: center; gap: 2px; padding-top: 1px; }
    .barcode svg { display: block; max-width: 100%; }
    .barcode-txt { font: 400 8.5px/1 ${PRINT_MONO_FAMILY}; letter-spacing: .2em; }
    .thanks { text-align: center; font-weight: 700; font-size: 10.5px; line-height: 1.25; }
    .legal { text-align: center; font-size: 8.5px; margin-top: -3px; }
  </style>
</head>
<body>
<div class="tk">

  <div class="brand">
    ${
      company.logoSrc
        ? `<img class="logo" src="${esc(company.logoSrc)}" alt="">`
        : `<div class="logo logo-fallback">${esc(company.name.charAt(0) || 'M')}</div>`
    }
    <div class="co-name" dir="auto">${esc(company.name)}</div>
    ${companySub ? `<div class="co-sub" dir="auto">${esc(companySub)}</div>` : ''}
  </div>

  <div class="title">
    <div class="title-k">${esc(data.title)}</div>
    <div class="title-no num">${esc(data.documentNumber)}</div>
    <div class="title-date">${L.date} : <strong class="num">${esc(data.date)}</strong></div>
  </div>

  <div class="pay">
    <div class="pay-glyph">${status.glyph}</div>
    <div class="pay-label">${esc(status.label)}</div>
  </div>
  ${status.state === 'partiel' ? `<div class="pay-hint">${esc(status.hint)}</div>` : ''}

  <div class="client">
    <div class="client-k">${L.deliverTo}</div>
    <div class="client-name" dir="auto">${esc(client.name)}</div>
    ${client.phone ? `<div class="client-phone">${L.phone} <span class="num">${esc(client.phone)}</span></div>` : ''}
    ${client.address ? `<div class="client-addr" dir="auto">${esc(client.address)}</div>` : ''}
  </div>

  <div class="items">${itemsHtml}</div>
  <div class="summary"><span>${esc(data.linesLabel)}</span><span>${esc(data.unitsLabel)}</span></div>

  ${breakdownHtml}

  <div class="grand">
    <div class="grand-row">
      <span class="grand-k">${L.total}</span>
      <span class="grand-v num">${esc(data.grandTotal)} ${esc(data.currency)}</span>
    </div>
    ${data.totalWords ? `<div class="grand-words">${esc(data.totalWords)}</div>` : ''}
  </div>

  ${
    data.barcodeSvg
      ? `<div class="barcode">${data.barcodeSvg}<div class="barcode-txt">${esc(data.documentNumber)}</div></div>`
      : ''
  }
  <div class="thanks">${L.thanks}</div>
  ${company.legalLine ? `<div class="legal">${esc(company.legalLine)}</div>` : ''}

</div>
</body>
</html>`;
}
