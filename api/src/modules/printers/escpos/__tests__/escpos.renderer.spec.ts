import { renderEscPos } from '../escpos.renderer';
import type { ReceiptData } from '../receipt.types';

const data: ReceiptData = {
  storeName: 'Cafe Atlas',
  storePhone: '0522-000000',
  orderNumber: 'CMD-0001',
  date: '2026-09-09 14:32',
  clientName: 'Yassine',
  items: [{ name: 'Coca 33cl', qty: 2, unitPrice: 6, total: 12 }],
  subtotal: 12,
  total: 12,
};

describe('renderEscPos', () => {
  it('starts with the ESC/POS init sequence', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'epson' });
    expect(out.subarray(0, 2)).toEqual(Buffer.from([0x1b, 0x40]));
  });

  it('pads item rows to 48 columns on 80mm paper', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'epson' }).toString('binary');
    const row = out.split('\n').find((l) => l.includes('2 x 6.00'));
    expect(row).toHaveLength(48);
  });

  it('pads item rows to 64 columns on 148mm paper', () => {
    const out = renderEscPos(data, { paperWidth: 148, brand: 'epson' }).toString('binary');
    const row = out.split('\n').find((l) => l.includes('2 x 6.00'));
    expect(row).toHaveLength(64);
  });

  it('ends with the Epson partial-cut sequence for epson printers', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'epson' });
    expect(out.subarray(-4)).toEqual(Buffer.from([0x1d, 0x56, 0x41, 0x00]));
  });

  it('ends with the Star feed-and-cut sequence for star printers', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'star' });
    expect(out.subarray(-3)).toEqual(Buffer.from([0x1b, 0x64, 0x03]));
  });

  it('does not emit an Epson feed before the Star cut (which would double-cut)', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'star' });
    // ESC d n is the cut on Star; it must appear exactly once.
    let count = 0;
    for (let i = 0; i < out.length - 1; i++) {
      if (out[i] === 0x1b && out[i + 1] === 0x64) count++;
    }
    expect(count).toBe(1);
  });

  it('treats generic printers as Epson dialect', () => {
    const generic = renderEscPos(data, { paperWidth: 80, brand: 'generic' });
    const epson = renderEscPos(data, { paperWidth: 80, brand: 'epson' });
    expect(generic).toEqual(epson);
  });

  it('includes the order, client and total', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'epson' }).toString('binary');
    expect(out).toContain('CMD-0001');
    expect(out).toContain('Yassine');
    expect(out).toContain('12.00 DH');
  });

  it('renders a stable golden receipt', () => {
    const out = renderEscPos(data, { paperWidth: 80, brand: 'epson' });
    expect(out.toString('hex')).toMatchSnapshot();
  });
});
