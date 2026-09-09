import type { ReceiptData, RenderOptions } from './receipt.types';

const ESC = '\x1B';
const GS = '\x1D';

/**
 * Feed-and-cut differs by manufacturer and the two are not interchangeable.
 *
 *  - Epson: feed 4 lines (ESC d 4), then partial cut (GS V A 0).
 *  - Star (Line Mode): ESC d 3 both feeds and cuts. Emitting Epson's ESC d 4
 *    first would be read as a second cut command, so Star gets no separate feed.
 */
function feedAndCut(brand: RenderOptions['brand']): string {
  return brand === 'star'
    ? `${ESC}\x64\x03`
    : `${ESC}\x64\x04${GS}\x56\x41\x00`;
}

/**
 * Renders a receipt to raw ESC/POS bytes.
 *
 * Note: output is Latin-1 (`binary`). Characters outside U+00FF are not
 * representable and would need a printer codepage command to render correctly.
 */
export function renderEscPos(data: ReceiptData, opts: RenderOptions): Buffer {
  const W = opts.paperWidth === 148 ? 64 : 48;
  const row = (l: string, r: string) => l.padEnd(W - r.length) + r + '\n';

  const parts: string[] = [
    `${ESC}\x40`, // initialise
    `${ESC}\x61\x01`, // centre
    `${ESC}\x21\x30`, // double size
    data.storeName + '\n',
    `${ESC}\x21\x00`, // normal size
    ...(data.storePhone ? [data.storePhone + '\n'] : []),
    '='.repeat(W) + '\n',
    `${ESC}\x61\x00`, // left
    `Commande : ${data.orderNumber}\n`,
    `Date     : ${data.date}\n`,
    `Client   : ${data.clientName}\n`,
    ...(data.clientPhone ? [`Tel      : ${data.clientPhone}\n`] : []),
    '-'.repeat(W) + '\n',
    ...data.items.flatMap((item) => [
      item.name + '\n',
      row(
        `  ${item.qty} x ${item.unitPrice.toFixed(2)} DH`,
        `${item.total.toFixed(2)} DH`,
      ),
    ]),
    '='.repeat(W) + '\n',
    `${ESC}\x61\x02`, // right
    `${ESC}\x45\x01`, // bold on
    row('TOTAL :', `${data.total.toFixed(2)} DH`),
    `${ESC}\x45\x00`, // bold off
    `${ESC}\x61\x01`, // centre
    '\n' + (data.footer ?? 'Merci pour votre confiance !') + '\n',
    feedAndCut(opts.brand),
  ];

  return Buffer.from(parts.join(''), 'binary');
}
