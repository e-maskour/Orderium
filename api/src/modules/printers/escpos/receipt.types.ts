/**
 * Receipt shapes shared by the API renderer and the print agent.
 * Mirrors the browser-side types that PrintManager used to own.
 */

export interface ReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  storeName: string;
  storePhone?: string;
  orderNumber: string;
  date: string;
  clientName: string;
  clientPhone?: string;
  items: ReceiptLine[];
  subtotal: number;
  discount?: number;
  total: number;
  footer?: string;
}

export interface RenderOptions {
  /** Physical paper width in millimetres. 80mm = 48 columns, 148mm = 64. */
  paperWidth: 80 | 148;
  /** Selects the ESC/POS dialect; only the cut sequence differs today. */
  brand: 'epson' | 'star' | 'generic';
}
